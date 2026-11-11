"""Trajets « nouveaux » (apparus dans les dernières 24 h de publications SNCF)."""
from app.domain.freshness import first_seen_for, is_new_trip, publication_changed

P_10_MORNING = "2026-11-10T05:23:14+00:00"
P_10_NOON = "2026-11-10T11:04:18+00:00"
P_11_MORNING = "2026-11-11T05:30:00+00:00"
P_12_MORNING = "2026-11-12T05:30:00+00:00"


def test_publication_changed_requires_known_previous_data():
    assert publication_changed(P_10_MORNING, P_10_NOON, previous_trip_count=40_000)
    assert not publication_changed(P_10_NOON, P_10_NOON, previous_trip_count=40_000)  # sync forcée
    assert not publication_changed(None, P_10_NOON, previous_trip_count=40_000)
    assert not publication_changed(P_10_MORNING, P_10_NOON, previous_trip_count=0)  # base vide
    assert not publication_changed(P_10_MORNING, None, previous_trip_count=40_000)


def test_first_seen_is_carried_over_or_stamped():
    previous = {"a": P_10_MORNING, "b": None}
    assert first_seen_for("a", previous, changed=True, current_publication=P_11_MORNING) == P_10_MORNING
    assert first_seen_for("b", previous, changed=True, current_publication=P_11_MORNING) is None
    # Absent de la publication précédente : apparu maintenant.
    assert first_seen_for("c", previous, changed=True, current_publication=P_11_MORNING) == P_11_MORNING
    # Même publication reconstruite : impossible de dater.
    assert first_seen_for("c", previous, changed=False, current_publication=P_11_MORNING) is None


def test_new_for_24_hours_of_publications():
    assert is_new_trip(P_11_MORNING, P_11_MORNING)
    assert is_new_trip(P_10_NOON, P_11_MORNING)  # 18 h plus tôt
    assert not is_new_trip(P_10_MORNING, P_12_MORNING)  # 2 jours
    assert not is_new_trip(None, P_11_MORNING)
    assert not is_new_trip(P_11_MORNING, None)
    assert not is_new_trip("pas une date", P_11_MORNING)


def test_trip_that_comes_back_is_new_again():
    # Vu le 10, absent le 11 (complet), revenu le 12 : nouvelle place disponible.
    previous_on_12 = {}  # absent de la base du 11
    seen = first_seen_for("a", previous_on_12, changed=True, current_publication=P_12_MORNING)
    assert is_new_trip(seen, P_12_MORNING)


async def _sync_docs(*, previous_first_seen, previous_publication, current_publication):
    from datetime import datetime, timedelta
    from unittest.mock import AsyncMock, MagicMock

    from app.domain.trips import PARIS_TZ
    from app.services.sync import SyncService

    day = (datetime.now(PARIS_TZ).date() + timedelta(days=2)).isoformat()
    rows = [
        {"date": day, "train_no": n, "origine": o, "destination": d, "entity": "X", "axe": "SUD EST",
         "heure_depart": "10:00", "heure_arrivee": "12:00", "od_happy_card": "OUI"}
        for n, o, d in (("5120", "LILLE (intramuros)", "LYON (intramuros)"), ("6180", "NICE VILLE", "CANNES"))
    ]
    trips = MagicMock()
    trips.first_seen_by_id = AsyncMock(return_value=previous_first_seen(day))
    trips.replace_all = AsyncMock()
    trips.cleanup_today_before = AsyncMock()
    trips.count = AsyncMock(return_value=2)
    sync = MagicMock()
    sync.get_sncf_data_updated_at = AsyncMock(return_value=previous_publication)
    sync.get_pipeline_version = AsyncMock(return_value=None)
    sync.update = AsyncMock()
    sncf = MagicMock()
    sncf.fetch_dataset_updated_at = AsyncMock(return_value=current_publication)
    sncf.fetch_export = AsyncMock(return_value=rows)
    await SyncService(MagicMock(), trips, sync, sncf, None).sync_trips()
    return {d["train_no"]: d for d in trips.replace_all.await_args.args[0]}


async def test_sync_marks_only_trips_absent_from_previous_publication():
    from app.domain.stations import trip_id

    docs = await _sync_docs(
        previous_first_seen=lambda day: {trip_id("5120", day, "LILLE (intramuros)", "LYON (intramuros)"): None},
        previous_publication=P_10_NOON,
        current_publication=P_11_MORNING,
    )
    assert (docs["5120"]["first_seen"], docs["5120"]["is_new"]) == (None, False)
    assert (docs["6180"]["first_seen"], docs["6180"]["is_new"]) == (P_11_MORNING, True)


async def test_forced_rebuild_of_same_publication_marks_nothing():
    docs = await _sync_docs(
        previous_first_seen=lambda day: {"autre": None},
        previous_publication=P_11_MORNING,
        current_publication=P_11_MORNING,
    )
    assert not any(d["is_new"] for d in docs.values())
