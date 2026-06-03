"""MongoDB access for the trips collection."""
import re
from typing import Any, Iterable

from app.domain.stations import HUB_METROPOLISES, trip_id
from app.domain.trips import paris_cleanup_cutoff


class TripsRepository:
    _PROJECTION = {
        "_id": 0,
        "origine_norm": 0,
        "destination_norm": 0,
        "synced_at": 0,
        "entity": 0,
        "od_happy_card": 0,
    }

    def __init__(self, collection) -> None:
        self._col = collection

    async def count(self) -> int:
        return await self._col.count_documents({})

    async def replace_all(self, docs: list[dict], *, chunk_size: int = 5000) -> None:
        await self._col.delete_many({})
        for i in range(0, len(docs), chunk_size):
            batch = docs[i : i + chunk_size]
            if batch:
                await self._col.insert_many(batch, ordered=False)

    async def cleanup_past(self) -> int:
        """RG4: remove trips whose departure has passed."""
        today, cur_time = paris_cleanup_cutoff()
        res1 = await self._col.delete_many({"date": {"$lt": today}})
        res2 = await self._col.delete_many({"date": today, "heure_depart": {"$lt": cur_time}})
        return res1.deleted_count + res2.deleted_count

    async def cleanup_today_before(self, cur_time: str) -> None:
        today, _ = paris_cleanup_cutoff()
        await self._col.delete_many({"date": today, "heure_depart": {"$lt": cur_time}})

    async def find_by_query(
        self, query: dict[str, Any], *, limit: int = 5000
    ) -> list[dict]:
        cursor = self._col.find(query, self._PROJECTION).sort([("departure_datetime", 1)])
        return await cursor.to_list(limit)

    async def find_departures_from_hubs(
        self,
        hubs: Iterable[str],
        dates: Iterable[str],
        *,
        limit: int = 5000,
    ) -> list[dict]:
        """
        Segments partant d'une métropole-hub (Paris, Lyon, …) pour les dates données.
        Préférer find_departures_from_hub_date_keys pour limiter le volume.
        """
        hub_list = [h for h in hubs if h in HUB_METROPOLISES]
        date_list = sorted({d for d in dates if d})
        if not hub_list or not date_list:
            return []
        query = {
            "origine_metropolis": {"$in": hub_list},
            "date": {"$in": date_list},
        }
        return await self.find_by_query(query, limit=limit)

    async def find_departures_from_hub_date_keys(
        self,
        keys: Iterable[tuple[str, str]],
        *,
        limit: int = 8000,
        chunk_size: int = 80,
    ) -> list[dict]:
        """
        Segments pour des paires (date, hub) précises — évite la troncature à 5000.
        """
        clauses: list[dict[str, Any]] = []
        for date, hub in keys:
            if date and hub in HUB_METROPOLISES:
                clauses.append({"date": date, "origine_metropolis": hub})
        if not clauses:
            return []
        seen_ids: set[str] = set()
        out: list[dict] = []
        for i in range(0, len(clauses), chunk_size):
            batch = clauses[i : i + chunk_size]
            query: dict[str, Any] = batch[0] if len(batch) == 1 else {"$or": batch}
            rows = await self.find_by_query(query, limit=limit)
            for row in rows:
                sid = trip_id(
                    row.get("train_no", ""),
                    row.get("date", ""),
                    row.get("origine", ""),
                    row.get("destination", ""),
                )
                if sid in seen_ids:
                    continue
                seen_ids.add(sid)
                out.append(row)
        return out

    async def exists_with_origine_norm(self, origin_norm: str) -> bool:
        doc = await self._col.find_one({"origine_norm": origin_norm})
        return doc is not None

    async def search_origines(self, q_norm: str, *, limit: int) -> list[str]:
        pipeline = [
            {"$match": {"origine_norm": {"$regex": re.escape(q_norm)}}},
            {"$group": {"_id": "$origine"}},
            {"$limit": limit * 2},
        ]
        rows = await self._col.aggregate(pipeline).to_list(limit * 2)
        return [r["_id"] for r in rows]
