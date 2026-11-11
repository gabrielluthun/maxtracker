"""Requêtes du dépôt trips sur une vraie base MongoDB."""
import pytest

from app.db.repositories.trips import TripsRepository


@pytest.mark.asyncio
async def test_station_suggestions_are_sorted_and_stable(trips_col):
    names = ["LYON ST EXUPERY TGV.", "LYON (intramuros)", "LYON PART DIEU", "LILLE EUROPE"]
    await trips_col.insert_many(
        [{"_id": f"t{i}", "origine": n, "origine_norm": n.upper()} for i, n in enumerate(names * 3)]
    )
    repo = TripsRepository(trips_col)
    results = [await repo.search_origines("LYON", limit=15) for _ in range(5)]
    assert results[0] == ["LYON (intramuros)", "LYON PART DIEU", "LYON ST EXUPERY TGV."]
    assert all(r == results[0] for r in results)
