"""MongoDB access for the pre-computed search_cache collection."""
from typing import Any, Optional


class SearchCacheRepository:
    """Stocke des réponses /search déjà calculées, indexées par clé d'origine.

    La validité est liée à `sync_at` : une entrée n'est servie que si elle
    correspond au dernier import de données (`last_sync_at`).
    """

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

    async def prune(self, *, keep_sync_at: Optional[str]) -> int:
        """Supprime les entrées d'une synchronisation antérieure."""
        res = await self._col.delete_many({"sync_at": {"$ne": keep_sync_at}})
        return res.deleted_count

    async def clear(self) -> None:
        await self._col.delete_many({})
