"""Endpoint de supervision /api/health."""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.main import create_app


def _iso(**ago):
    return (datetime.now(timezone.utc) - timedelta(**ago)).isoformat()


def _client(*, ping_ok=True, state=None):
    app = create_app()
    db = MagicMock()
    db.ping = AsyncMock(side_effect=None if ping_ok else ConnectionError("refused"))
    sync_repo = MagicMock()
    sync_repo.get = AsyncMock(return_value=state or {})
    app.state.db = db
    app.state.sync_repo = sync_repo
    return TestClient(app), sync_repo


HEALTHY = {
    "last_sync_status": "skipped",
    "last_attempt_at": _iso(minutes=5),
    "sncf_data_updated_at": _iso(hours=10),
    "total_trips": 40972,
}


def test_healthy_service():
    client, _ = _client(state=HEALTHY)
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok" and body["mongo"] == "ok" and body["problems"] == []
    assert 4 <= body["last_attempt_age_minutes"] <= 6
    assert body["total_trips"] == 40972


def test_mongo_down_is_503_and_skips_sync_state():
    client, sync_repo = _client(ping_ok=False)
    res = client.get("/api/health")
    assert res.status_code == 503
    assert res.json()["status"] == "down" and res.json()["mongo"] == "error"
    sync_repo.get.assert_not_awaited()


def test_stuck_scheduler_is_503():
    client, _ = _client(state={**HEALTHY, "last_attempt_at": _iso(hours=2)})
    res = client.get("/api/health")
    assert res.status_code == 503
    assert "aucune tentative" in res.json()["problems"][0]


def test_stale_sncf_data_and_failed_sync_are_degraded_not_down():
    state = {**HEALTHY, "last_sync_status": "error", "sncf_data_updated_at": _iso(hours=40)}
    client, _ = _client(state=state)
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "degraded"
    assert len(body["problems"]) == 2
    assert body["sncf_data_age_hours"] >= 40


def test_legacy_root_endpoint_unchanged():
    client, _ = _client(state=HEALTHY)
    assert client.get("/api/").json() == {"app": "MaxTracker", "status": "ok"}
