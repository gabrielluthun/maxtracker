"""Compression gzip des réponses de l'API."""
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.main import GZIP_MIN_SIZE_BYTES, create_app


def _client_with_payload(size: int) -> TestClient:
    app = create_app()
    router = APIRouter()

    @router.get("/_test/payload")
    async def payload():
        return {"data": "x" * size}

    app.include_router(router)
    # Sans `with` : le lifespan (Mongo, scheduler) n'est pas démarré.
    return TestClient(app)


def test_large_response_is_gzipped():
    client = _client_with_payload(50_000)
    res = client.get("/_test/payload", headers={"Accept-Encoding": "gzip"})
    assert res.status_code == 200
    assert res.headers.get("content-encoding") == "gzip"
    assert res.json()["data"] == "x" * 50_000


def test_small_response_is_not_gzipped():
    client = _client_with_payload(10)
    res = client.get("/_test/payload", headers={"Accept-Encoding": "gzip"})
    assert len(res.content) < GZIP_MIN_SIZE_BYTES
    assert "content-encoding" not in res.headers


def test_no_gzip_when_client_does_not_accept_it():
    client = _client_with_payload(50_000)
    res = client.get("/_test/payload", headers={"Accept-Encoding": "identity"})
    assert "content-encoding" not in res.headers
