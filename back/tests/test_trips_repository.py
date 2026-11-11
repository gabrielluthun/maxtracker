"""Requêtes du dépôt trips sur une vraie base MongoDB."""
import pytest

from app.db.repositories.trips import TripsRepository


@pytest.mark.asyncio
async def test_origin_codes_lists_each_station_code_once(trips_col):
    docs = [
        {"_id": "1", "origine": "PARIS (intramuros)", "origine_iata": "FRPMO"},
        {"_id": "2", "origine": "PARIS (intramuros)", "origine_iata": "FRPMO"},
        {"_id": "3", "origine": "PARIS (intramuros)", "origine_iata": "FRPLY"},
        {"_id": "4", "origine": "ST MALO", "origine_iata": "FRXSL"},
    ]
    await trips_col.insert_many(docs)
    rows = await TripsRepository(trips_col).origin_codes()
    assert sorted((r["origine"], r["iata"]) for r in rows) == [
        ("PARIS (intramuros)", "FRPLY"),
        ("PARIS (intramuros)", "FRPMO"),
        ("ST MALO", "FRXSL"),
    ]


def _hub_doc(i, date, hub):
    return {
        "_id": f"{hub}-{date}-{i}",
        "train_no": f"{i:04d}",
        "date": date,
        "origine": f"{hub.upper()} (intramuros)",
        "destination": "NICE VILLE",
        "origine_metropolis": hub,
        "heure_depart": f"{6 + i % 16:02d}:{i % 60:02d}",
        "departure_datetime": f"{date}T{6 + i % 16:02d}:{i % 60:02d}:00",
    }


@pytest.mark.asyncio
async def test_hub_departures_are_never_truncated(trips_col):
    # 9 000 départs : au-delà des anciens plafonds (5 000 en production, 8 000 par défaut).
    dates = [f"2099-01-{d:02d}" for d in range(1, 31)]
    docs = [_hub_doc(i, date, hub) for hub in ("Paris", "Lyon") for date in dates for i in range(150)]
    await trips_col.insert_many(docs)
    rows = await TripsRepository(trips_col).find_departures_from_hub_date_keys(
        {(date, hub) for hub in ("Paris", "Lyon") for date in dates}
    )
    assert len(rows) == 9000


@pytest.mark.asyncio
async def test_query_limit_is_reported_when_reached(trips_col, caplog):
    await trips_col.insert_many([_hub_doc(i, "2099-01-01", "Paris") for i in range(30)])
    repo = TripsRepository(trips_col)
    with caplog.at_level("WARNING", logger="maxtracker"):
        assert len(await repo.find_by_query({"origine_metropolis": "Paris"}, limit=20)) == 20
        assert len(await repo.find_by_query({"origine_metropolis": "Paris"}, limit=50)) == 30
    assert sum("hit limit=20" in r.getMessage() for r in caplog.records) == 1
    assert not any("limit=50" in r.getMessage() for r in caplog.records)
