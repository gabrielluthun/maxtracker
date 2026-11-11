"""Route /search et cache des réponses déjà compressées."""
import gzip
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.routes.search import accepts_gzip
from app.core.rate_limit import RateLimiter, RateLimitExceeded
from app.domain.trips import PARIS_TZ
from app.main import create_app
from app.services.search import SearchService

BODY = {"origin": "Paris", "total_trips": 0, "groups": [], "served": True}


def _client(search_gzip):
    app = create_app()
    svc = MagicMock()
    svc.search_gzip = search_gzip
    app.state.search_service = svc
    return TestClient(app)


@pytest.mark.parametrize(
    "header,expected",
    [
        ("gzip, deflate, br", True),
        ("br;q=1.0, gzip;q=0.8", True),
        ("gzip;q=0", False),
        ("identity", False),
        ("*", True),
        ("", False),
    ],
)
def test_accepts_gzip(header, expected):
    assert accepts_gzip(header) is expected


def test_route_serves_precompressed_body():
    search = AsyncMock(return_value=gzip.compress(json.dumps(BODY).encode()))
    res = _client(search).get("/api/search", params={"origin": " Paris "})
    assert res.status_code == 200
    assert res.headers["content-encoding"] == "gzip"
    assert "accept-encoding" in res.headers["vary"].lower()
    assert res.json() == BODY
    search.assert_awaited_once_with("Paris", client_ip="testclient", connections=True, compact=False)


def test_route_decompresses_for_clients_without_gzip():
    search = AsyncMock(return_value=gzip.compress(json.dumps(BODY).encode()))
    res = _client(search).get(
        "/api/search", params={"origin": "Paris"}, headers={"Accept-Encoding": "identity"}
    )
    assert "content-encoding" not in res.headers
    assert json.loads(res.content) == BODY


def test_route_forwards_variant_flags():
    search = AsyncMock(return_value=gzip.compress(b"{}"))
    _client(search).get("/api/search", params={"origin": "Paris", "connections": "0", "compact": "1"})
    assert search.await_args.kwargs["connections"] is False
    assert search.await_args.kwargs["compact"] is True


def test_route_rejects_empty_origin_and_maps_rate_limit():
    assert _client(AsyncMock()).get("/api/search", params={"origin": " "}).status_code == 400
    limited = AsyncMock(side_effect=RateLimitExceeded())
    assert _client(limited).get("/api/search", params={"origin": "Paris"}).status_code == 429


# --- Cache des réponses mises en forme --------------------------------------


def _service():
    settings = MagicMock(sncf_connect_base="https://www.sncf-connect.com")
    sync = MagicMock()
    sync.get_last_sync_at = AsyncMock(return_value="sync-1")
    cache = MagicMock()
    cache.get = AsyncMock(return_value=None)
    svc = SearchService(settings, MagicMock(), sync, None, cache, RateLimiter(10))
    svc._memory.set("metro:Paris", {"total_trips": 0, "groups": []}, sync_at="sync-1")
    return svc


@pytest.mark.asyncio
async def test_rendered_response_is_reused_within_the_minute():
    svc = _service()
    now = datetime(2026, 11, 12, 10, 0, 5, tzinfo=PARIS_TZ)
    with patch("app.services.search.render_search_payload", wraps=lambda p, **kw: {**p, **{"origin": kw["origin"]}}) as render:
        first = await svc.search_gzip("Paris", now=now)
        again = await svc.search_gzip("Paris", now=now + timedelta(seconds=40))
        assert first == again
        assert render.call_count == 1

        await svc.search_gzip("Paris", now=now + timedelta(minutes=1))
        assert render.call_count == 2  # minute suivante : départs passés recalculés

        await svc.search_gzip("Paris", now=now, connections=False)
        await svc.search_gzip("Paris", now=now, compact=True)
        assert render.call_count == 4  # une entrée par variante


@pytest.mark.asyncio
async def test_rendered_response_follows_new_data():
    svc = _service()
    now = datetime(2026, 11, 12, 10, 0, tzinfo=PARIS_TZ)
    before = json.loads(gzip.decompress(await svc.search_gzip("Paris", now=now)))
    svc._memory.set(
        "metro:Paris", {"total_trips": 0, "groups": [], "last_sync_at": "sync-2"}, sync_at="sync-2"
    )
    after = json.loads(gzip.decompress(await svc.search_gzip("Paris", now=now)))
    assert before.get("last_sync_at") != after.get("last_sync_at")


@pytest.mark.asyncio
async def test_single_connection_search_loads_hub_departures_once():
    """Avec 1 correspondance (production), pas de 2e requête pour un 3e train."""
    from app.config import get_settings

    leg1 = {
        "train_no": "1", "date": "2099-01-01", "origine": "LILLE (intramuros)", "destination": "PARIS (intramuros)",
        "heure_depart": "08:00", "heure_arrivee": "09:00", "origine_metropolis": "Lille",
        "destination_metropolis": "Paris", "train_type": "TGV_INOUI", "departure_datetime": "2099-01-01T08:00:00",
    }
    leg2 = {
        **leg1, "train_no": "2", "origine": "PARIS (intramuros)", "destination": "LYON (intramuros)",
        "heure_depart": "10:00", "heure_arrivee": "12:00", "origine_metropolis": "Paris",
        "destination_metropolis": "Lyon", "departure_datetime": "2099-01-01T10:00:00",
    }
    trips = MagicMock()
    trips.find_by_query = AsyncMock(return_value=[leg1])
    trips.find_departures_from_hub_date_keys = AsyncMock(return_value=[leg2])
    sync = MagicMock()
    sync.get_last_sync_at = AsyncMock(return_value="sync-1")
    svc = SearchService(get_settings(), trips, sync, None, MagicMock(), RateLimiter(10))

    resp = await svc._compute_search_response("Lille")

    trips.find_departures_from_hub_date_keys.assert_awaited_once()
    assert [c.hub_metropolis for g in resp.groups for c in g.connected_trips] == ["Paris"]
