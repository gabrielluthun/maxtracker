"""MongoDB connection and collection accessors."""
from pymongo import AsyncMongoClient
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from app.config import Settings
from app.db.repositories.trips import TRIPS_INDEXES


class Database:
    def __init__(self, settings: Settings) -> None:
        # Client asynchrone natif de PyMongo (remplace Motor, déprécié par MongoDB).
        self._client: AsyncMongoClient = AsyncMongoClient(settings.mongo_url)
        self._db: AsyncDatabase = self._client[settings.db_name]

    @property
    def trips(self) -> AsyncCollection:
        return self._db.trips

    @property
    def sync_state(self) -> AsyncCollection:
        return self._db.sync_state

    @property
    def search_cache(self) -> AsyncCollection:
        return self._db.search_cache

    async def ensure_indexes(self) -> None:
        for keys in TRIPS_INDEXES:
            await self.trips.create_index(keys)
        await self.search_cache.create_index("sync_at")

    async def ping(self) -> None:
        """Lève une exception si MongoDB ne répond pas."""
        await self._client.admin.command("ping")

    async def close(self) -> None:
        await self._client.close()
