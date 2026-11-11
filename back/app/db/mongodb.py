"""MongoDB connection and collection accessors."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase

from app.config import Settings
from app.db.repositories.trips import TRIPS_INDEXES


class Database:
    def __init__(self, settings: Settings) -> None:
        self._client = AsyncIOMotorClient(settings.mongo_url)
        self._db: AsyncIOMotorDatabase = self._client[settings.db_name]

    @property
    def trips(self) -> AsyncIOMotorCollection:
        return self._db.trips

    @property
    def sync_state(self) -> AsyncIOMotorCollection:
        return self._db.sync_state

    @property
    def search_cache(self) -> AsyncIOMotorCollection:
        return self._db.search_cache

    async def ensure_indexes(self) -> None:
        for keys in TRIPS_INDEXES:
            await self.trips.create_index(keys)
        await self.search_cache.create_index("sync_at")

    async def close(self) -> None:
        self._client.close()
