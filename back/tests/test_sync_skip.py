"""Skip du rebuild SNCF quand le dataset n'a pas changé."""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.sync import PIPELINE_VERSION, SyncService


def _service(*, sncf_updated, previous, version=PIPELINE_VERSION):
    settings = MagicMock()
    trips = MagicMock()
    trips.replace_all = AsyncMock()
    trips.cleanup_today_before = AsyncMock()
    trips.count = AsyncMock(return_value=10)
    sync = MagicMock()
    sync.get_sncf_data_updated_at = AsyncMock(return_value=previous)
    sync.get_pipeline_version = AsyncMock(return_value=version)
    sync.update = AsyncMock()
    sncf = MagicMock()
    sncf.fetch_dataset_updated_at = AsyncMock(return_value=sncf_updated)
    sncf.fetch_export = AsyncMock(return_value=[])
    search = MagicMock()
    search.warm_cache = AsyncMock()
    return SyncService(settings, trips, sync, sncf, search), trips, sncf, sync


@pytest.mark.asyncio
async def test_skip_when_sncf_timestamp_unchanged():
    svc, trips, sncf, sync = _service(
        sncf_updated="2026-08-14T06:30:00",
        previous="2026-08-14T06:30:00",
    )
    result = await svc.sync_trips()
    assert result == {"status": "skipped", "reason": "sncf_unchanged"}
    sncf.fetch_export.assert_not_called()
    trips.replace_all.assert_not_called()
    sync.update.assert_awaited()
    payload = sync.update.await_args.args[0]
    assert payload["last_sync_status"] == "skipped"
    assert payload["last_attempt_at"]


@pytest.mark.asyncio
async def test_force_rebuilds_even_if_timestamp_unchanged():
    svc, trips, sncf, _sync = _service(
        sncf_updated="2026-08-14T06:30:00",
        previous="2026-08-14T06:30:00",
    )
    result = await svc.sync_trips(force=True)
    assert result["status"] == "ok"
    sncf.fetch_export.assert_awaited()
    trips.replace_all.assert_awaited()


@pytest.mark.asyncio
async def test_full_sync_when_timestamp_changes():
    svc, trips, sncf, _sync = _service(
        sncf_updated="2026-08-15T06:30:00",
        previous="2026-08-14T06:30:00",
    )
    result = await svc.sync_trips()
    assert result["status"] == "ok"
    sncf.fetch_export.assert_awaited()


@pytest.mark.asyncio
async def test_full_sync_when_metadata_unavailable():
    svc, trips, sncf, _sync = _service(sncf_updated=None, previous="2026-08-14T06:30:00")
    result = await svc.sync_trips()
    assert result["status"] == "ok"
    sncf.fetch_export.assert_awaited()


@pytest.mark.asyncio
async def test_full_rebuild_after_deploying_a_new_pipeline_version():
    # Même publication SNCF, mais données traitées par une version antérieure.
    svc, trips, sncf, sync = _service(
        sncf_updated="2026-08-14T06:30:00",
        previous="2026-08-14T06:30:00",
        version=PIPELINE_VERSION - 1,
    )
    result = await svc.sync_trips()
    assert result["status"] == "ok"
    sncf.fetch_export.assert_awaited()
    trips.replace_all.assert_awaited()
    assert sync.update.await_args.args[0]["pipeline_version"] == PIPELINE_VERSION


@pytest.mark.asyncio
async def test_full_rebuild_when_no_version_was_ever_stored():
    svc, trips, sncf, _sync = _service(
        sncf_updated="2026-08-14T06:30:00",
        previous="2026-08-14T06:30:00",
        version=None,
    )
    assert (await svc.sync_trips())["status"] == "ok"
    trips.replace_all.assert_awaited()
