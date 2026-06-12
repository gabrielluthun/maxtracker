"""MongoDB access for the pre-computed search_cache collection."""
from typing import Any, Optional


class SearchCacheRepository:
    def __init__(self, collection) -> None:
        self._col = collection

    async def get(self, key: str) -> Optional[dict[str, Any]]:
        return await self._col.find_one({"_id": key})

    async def set(self, key: str, payload: dict[str, Any], *, sync_at: Optional[str]) -> None:
        await self._col.update_one(
            {"_id": key},
            {"$set": {"payload": payload, "sync_at": sync_at}},
            upsert=True,
        )

    async def metro_entries(self, *, limit: int = 32) -> list[dict[str, Any]]:
        """Entrées métropole uniquement — petit volume, prioritaire au boot."""
        cursor = (
            self._col.find(
                {"_id": {"$regex": r"^metro:"}},
                {"_id": 1, "payload": 1, "sync_at": 1},
            )
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def prune(self, *, keep_sync_at: Optional[str]) -> int:
        res = await self._col.delete_many({"sync_at": {"$ne": keep_sync_at}})
        return res.deleted_count
