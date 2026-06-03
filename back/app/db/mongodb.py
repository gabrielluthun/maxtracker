"""MongoDB connection and collection accessors."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase

from app.config import Settings


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

    async def ensure_indexes(self) -> None:
        await self.trips.create_index("origine_norm")
        await self.trips.create_index("destination_norm")
        await self.trips.create_index("origine_metropolis")
        await self.trips.create_index("destination_metropolis")
        await self.trips.create_index([("origine_metropolis", 1), ("date", 1)])
        await self.trips.create_index("date")
        await self.trips.create_index("departure_datetime")

    async def close(self) -> None:
        self._client.close()
