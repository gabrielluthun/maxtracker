"""IP du client derrière des proxys, et limite de requêtes."""
import logging

import pytest
from starlette.requests import Request

from app.core.client_ip import client_ip, reset_diagnostic
from app.core.rate_limit import RateLimiter


def _request(peer="10.0.0.5", forwarded=None):
    headers = [] if forwarded is None else [(b"x-forwarded-for", forwarded.encode())]
    return Request({"type": "http", "headers": headers, "client": (peer, 1234)})


def setup_function():
    reset_diagnostic()


def test_default_uses_the_direct_peer():
    assert client_ip(_request(forwarded="203.0.113.7, 76.76.21.1")) == "10.0.0.5"


def test_vercel_then_uvicorn_trusts_one_hop():
    # Vercel ajoute l'IP du client ; uvicorn voit Vercel comme pair direct.
    assert client_ip(_request(peer="76.76.21.1", forwarded="203.0.113.7"), trusted_hops=1) == "203.0.113.7"


def test_vercel_nginx_uvicorn_trusts_two_hops():
    # nginx ajoute l'IP de Vercel à droite de celle du client.
    req = _request(peer="127.0.0.1", forwarded="203.0.113.7, 76.76.21.1")
    assert client_ip(req, trusted_hops=2) == "203.0.113.7"


def test_client_supplied_entries_on_the_left_are_ignored():
    req = _request(peer="127.0.0.1", forwarded="6.6.6.6, 203.0.113.7, 76.76.21.1")
    assert client_ip(req, trusted_hops=2) == "203.0.113.7"


def test_shorter_chain_than_expected_uses_first_trusted_entry():
    # Requête arrivée sur nginx sans passer par Vercel.
    req = _request(peer="127.0.0.1", forwarded="198.51.100.9")
    assert client_ip(req, trusted_hops=2) == "198.51.100.9"


def test_missing_header_falls_back_to_peer():
    assert client_ip(_request(peer="76.76.21.1"), trusted_hops=1) == "76.76.21.1"


def test_diagnostic_is_logged_once_without_ip_addresses(caplog):
    with caplog.at_level(logging.INFO, logger="maxtracker"):
        client_ip(_request(peer="127.0.0.1", forwarded="203.0.113.7, 76.76.21.1"), trusted_hops=2)
        client_ip(_request(peer="127.0.0.1", forwarded="203.0.113.8, 76.76.21.1"), trusted_hops=2)
    messages = [r.getMessage() for r in caplog.records if "client IP" in r.getMessage()]
    assert len(messages) == 1
    assert "2 entrée(s)" in messages[0] and "loopback" in messages[0]
    assert "203.0.113" not in messages[0] and "76.76" not in messages[0]


class _Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def test_rate_limiter_blocks_then_releases_after_window():
    clock = _Clock()
    limiter = RateLimiter(2, window_seconds=60, clock=clock)
    assert limiter.allow("a") and limiter.allow("a")
    assert not limiter.allow("a")
    assert limiter.allow("b")  # quota par IP
    clock.now = 61
    assert limiter.allow("a")


def test_rate_limiter_forgets_idle_clients():
    clock = _Clock()
    limiter = RateLimiter(5, window_seconds=60, clock=clock)
    for i in range(100):
        limiter.allow(f"ip-{i}")
    assert len(limiter) == 100
    clock.now = 120
    limiter.allow("fresh")
    assert len(limiter) == 1


@pytest.mark.parametrize("hops", [0, 1, 2])
def test_route_uses_configured_hops(monkeypatch, hops):
    from unittest.mock import AsyncMock, MagicMock
    import gzip

    from fastapi.testclient import TestClient

    from app.config import get_settings
    from app.main import create_app

    monkeypatch.setenv("TRUSTED_PROXY_HOPS", str(hops))
    get_settings.cache_clear()
    try:
        app = create_app()
        svc = MagicMock()
        svc.search_gzip = AsyncMock(return_value=gzip.compress(b"{}"))
        app.state.search_service = svc
        TestClient(app).get(
            "/api/search",
            params={"origin": "Paris"},
            headers={"X-Forwarded-For": "203.0.113.7, 76.76.21.1"},
        )
        expected = {0: "testclient", 1: "76.76.21.1", 2: "203.0.113.7"}[hops]
        assert svc.search_gzip.await_args.kwargs["client_ip"] == expected
    finally:
        get_settings.cache_clear()
