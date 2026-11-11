"""Remplacement atomique de la collection trips (staging + renameCollection)."""
import asyncio
import os
import uuid

import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError

from app.db.repositories.trips import TRIPS_INDEXES, TripsRepository

MONGO_URL = "mongodb://127.0.0.1:27017"


async def _mongo_or_skip():
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=500)
    try:
        await client.admin.command("ping")
    except PyMongoError:
        client.close()
        if os.environ.get("REQUIRE_MONGO"):
            raise  # en CI, une base absente est une erreur, pas un test ignoré
        pytest.skip("MongoDB local indisponible")
    return client


@pytest.fixture
async def trips_col():
    client = await _mongo_or_skip()
    db = client[f"tgvmax_test_{uuid.uuid4().hex[:8]}"]
    try:
        yield db.trips
    finally:
        await client.drop_database(db.name)
        client.close()


def _docs(prefix: str, n: int) -> list[dict]:
    return [{"_id": f"{prefix}-{i}", "batch": prefix} for i in range(n)]


@pytest.mark.asyncio
async def test_replace_all_swaps_content_and_keeps_indexes(trips_col):
    await trips_col.insert_many(_docs("old", 3))
    repo = TripsRepository(trips_col)

    await repo.replace_all(_docs("new", 7), chunk_size=2)

    assert await trips_col.count_documents({}) == 7
    assert await trips_col.count_documents({"batch": "old"}) == 0
    names = await trips_col.database.list_collection_names()
    assert "trips_staging" not in names
    index_keys = [list(ix["key"]) for ix in (await trips_col.index_information()).values()]
    for keys in TRIPS_INDEXES:
        assert keys in index_keys


@pytest.mark.asyncio
async def test_readers_never_see_an_empty_collection_during_replace(trips_col):
    await trips_col.insert_many(_docs("old", 500))
    repo = TripsRepository(trips_col)
    seen_counts: list[int] = []
    done = asyncio.Event()

    async def reader():
        while not done.is_set():
            seen_counts.append(await trips_col.count_documents({}))
            await asyncio.sleep(0)

    task = asyncio.create_task(reader())
    await repo.replace_all(_docs("new", 2000), chunk_size=100)
    done.set()
    await task

    assert seen_counts, "le lecteur n'a jamais tourné"
    assert set(seen_counts) <= {500, 2000}


@pytest.mark.asyncio
async def test_replace_all_cleans_leftover_staging(trips_col):
    staging = trips_col.database["trips_staging"]
    await staging.insert_many(_docs("stale", 4))
    repo = TripsRepository(trips_col)

    await repo.replace_all(_docs("new", 2))

    assert await trips_col.count_documents({"batch": "stale"}) == 0
    assert await trips_col.count_documents({}) == 2


@pytest.mark.asyncio
async def test_replace_all_with_no_docs_empties_collection(trips_col):
    await trips_col.insert_many(_docs("old", 3))
    await TripsRepository(trips_col).replace_all([])
    assert await trips_col.count_documents({}) == 0
