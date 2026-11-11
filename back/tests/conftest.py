"""Pytest configuration — assure l'import du package app depuis back/."""
import os
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Valeurs par défaut pour importer app.main sans .env (CI). Aucune connexion
# Mongo n'est ouverte à l'import : le client n'est créé que dans le lifespan.
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "tgvmax_test")


TEST_MONGO_URL = os.environ.get("TEST_MONGO_URL", "mongodb://127.0.0.1:27017")


@pytest.fixture
async def trips_col():
    """Collection `trips` dans une base jetable ; test ignoré sans MongoDB local.

    Avec REQUIRE_MONGO=1 (CI), une base absente fait échouer le test au lieu de l'ignorer.
    """
    from pymongo import AsyncMongoClient
    from pymongo.errors import PyMongoError

    client = AsyncMongoClient(TEST_MONGO_URL, serverSelectionTimeoutMS=500)
    try:
        await client.admin.command("ping")
    except PyMongoError:
        await client.close()
        if os.environ.get("REQUIRE_MONGO"):
            raise
        pytest.skip("MongoDB local indisponible")
    db = client[f"tgvmax_test_{uuid.uuid4().hex[:8]}"]
    try:
        yield db.trips
    finally:
        await client.drop_database(db.name)
        await client.close()
