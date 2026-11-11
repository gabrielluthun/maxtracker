"""Sérialisation des syncs et délai entre deux syncs manuelles."""
import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.sync import SyncCooldown, SyncService


class _FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def _service(*, fetch_export=None, cooldown=180, clock=None):
    trips = MagicMock()
    trips.replace_all = AsyncMock()
    trips.first_seen_by_id = AsyncMock(return_value={})
    trips.cleanup_today_before = AsyncMock()
    trips.count = AsyncMock(return_value=10)
    sync = MagicMock()
    sync.get_sncf_data_updated_at = AsyncMock(return_value="2026-08-14T06:30:00")
    sync.update = AsyncMock()
    sncf = MagicMock()
    sncf.fetch_dataset_updated_at = AsyncMock(return_value="2026-08-15T06:30:00")
    sncf.fetch_export = fetch_export or AsyncMock(return_value=[])
    svc = SyncService(
        MagicMock(),
        trips,
        sync,
        sncf,
        None,
        manual_cooldown_seconds=cooldown,
        clock=clock or _FakeClock(),
    )
    return svc, trips


@pytest.mark.asyncio
async def test_concurrent_syncs_run_only_once():
    release = asyncio.Event()

    async def slow_export():
        await release.wait()
        return []

    svc, trips = _service(fetch_export=AsyncMock(side_effect=slow_export))
    first = asyncio.create_task(svc.sync_trips(force=True))
    await asyncio.sleep(0)  # first acquiert le verrou et attend l'export
    second = await svc.sync_trips(force=True)
    assert second == {"status": "skipped", "reason": "sync_in_progress"}

    release.set()
    assert (await first)["status"] == "ok"
    trips.replace_all.assert_awaited_once()


@pytest.mark.asyncio
async def test_lock_is_released_after_a_failed_sync():
    svc, trips = _service(fetch_export=AsyncMock(side_effect=RuntimeError("boom")))
    with pytest.raises(RuntimeError):
        await svc.sync_trips(force=True)
    svc._sncf.fetch_export = AsyncMock(return_value=[])
    assert (await svc.sync_trips(force=True))["status"] == "ok"


@pytest.mark.asyncio
async def test_manual_sync_cooldown():
    clock = _FakeClock()
    svc, trips = _service(cooldown=180, clock=clock)

    assert svc.manual_sync_retry_after() == 0
    assert (await svc.trigger_manual_sync())["status"] == "ok"

    clock.now += 60
    with pytest.raises(SyncCooldown) as exc:
        await svc.trigger_manual_sync()
    assert exc.value.retry_after_seconds == 120
    trips.replace_all.assert_awaited_once()

    clock.now += 120
    assert svc.manual_sync_retry_after() == 0
    assert (await svc.trigger_manual_sync())["status"] == "ok"


def test_trigger_route_returns_429_with_retry_after():
    app = create_app()
    svc = MagicMock()
    svc.trigger_manual_sync = AsyncMock(side_effect=SyncCooldown(42))
    app.state.sync_service = svc
    res = TestClient(app).post("/api/sync/trigger")
    assert res.status_code == 429
    assert res.headers["retry-after"] == "42"


def test_trigger_route_returns_sync_result():
    app = create_app()
    svc = MagicMock()
    svc.trigger_manual_sync = AsyncMock(return_value={"status": "ok", "total": 3})
    app.state.sync_service = svc
    res = TestClient(app).post("/api/sync/trigger")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "total": 3}
