"""MongoDB access for the trips collection."""
import logging
from typing import Any, Iterable, Optional

from app.domain.stations import HUB_METROPOLISES, trip_id
from app.domain.trips import paris_cleanup_cutoff

logger = logging.getLogger("maxtracker")

# Index de la collection trips — recréés sur la collection de staging avant la
# bascule, car rename(dropTarget=True) remplace aussi les index de la cible.
TRIPS_INDEXES: tuple[list[tuple[str, int]], ...] = (
    [("origine_norm", 1), ("departure_datetime", 1)],
    [("origine_metropolis", 1), ("departure_datetime", 1)],
    [("date", 1), ("origine_metropolis", 1), ("departure_datetime", 1)],
    [("date", 1), ("heure_depart", 1)],
    [("origine_norm", 1), ("origine", 1)],
)


def _active_departure_filter() -> dict[str, Any]:
    """Exclut les départs déjà passés — filtre appliqué côté Mongo."""
    today, cur_time = paris_cleanup_cutoff()
    return {
        "$or": [
            {"date": {"$gt": today}},
            {"date": today, "heure_depart": {"$gte": cur_time}},
        ]
    }


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
        """Remplace tout le contenu de façon atomique pour les lecteurs.

        Les documents sont écrits dans `<trips>_staging`, indexés, puis la
        collection est basculée par un seul `renameCollection` : une recherche
        concurrente voit soit l'ancien jeu complet, soit le nouveau, jamais une
        collection vide ou à moitié remplie.
        """
        if not docs:
            await self._col.delete_many({})
            return
        staging = self._col.database[f"{self._col.name}_staging"]
        await staging.drop()  # reste d'une sync interrompue
        for i in range(0, len(docs), chunk_size):
            batch = docs[i : i + chunk_size]
            if batch:
                await staging.insert_many(batch, ordered=False)
        for keys in TRIPS_INDEXES:
            await staging.create_index(keys)
        await staging.rename(self._col.name, dropTarget=True)

    async def first_seen_by_id(self) -> dict[str, Optional[str]]:
        """Date d'apparition connue de chaque trajet en base (avant remplacement)."""
        cursor = self._col.find({}, {"first_seen": 1})
        return {d["_id"]: d.get("first_seen") for d in await cursor.to_list(None)}

    async def cleanup_past(self) -> int:
        today, cur_time = paris_cleanup_cutoff()
        res1 = await self._col.delete_many({"date": {"$lt": today}})
        res2 = await self._col.delete_many({"date": today, "heure_depart": {"$lt": cur_time}})
        return res1.deleted_count + res2.deleted_count

    async def cleanup_today_before(self, cur_time: str) -> None:
        today, _ = paris_cleanup_cutoff()
        await self._col.delete_many({"date": today, "heure_depart": {"$lt": cur_time}})

    async def find_by_query(
        self, query: dict[str, Any], *, limit: Optional[int] = None
    ) -> list[dict]:
        """Trajets à venir correspondant à `query`, triés par heure de départ.

        `limit` est un garde-fou mémoire : s'il est atteint, les départs les plus
        tardifs manquent. On le signale toujours dans les logs — une troncature
        silencieuse a déjà fait disparaître ~11 000 correspondances.
        """
        full_query = {"$and": [query, _active_departure_filter()]}
        cursor = self._col.find(full_query, self._PROJECTION).sort(
            [("departure_datetime", 1)]
        )
        rows = await cursor.to_list(limit)
        if limit is not None and len(rows) >= limit:
            logger.warning(
                "trips query hit limit=%d: later departures are missing from the results", limit
            )
        return rows

    async def find_departures_from_hub_date_keys(
        self,
        keys: Iterable[tuple[str, str]],
        *,
        chunk_size: int = 80,
    ) -> list[dict]:
        """Tous les départs à venir des couples (date, hub) demandés.

        Pas de plafond : le volume est borné par les clés (≤ 31 jours × hubs),
        soit ~15 000 documents au pire (Paris).
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
            rows = await self.find_by_query(query)
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

    async def distinct_origines_norm(self) -> list[str]:
        vals = await self._col.distinct("origine_norm")
        return [v for v in vals if v]

    async def distinct_origine_metropolis(self) -> list[str]:
        vals = await self._col.distinct("origine_metropolis")
        return [v for v in vals if v]

    async def origin_codes(self) -> list[dict]:
        """Couples distincts {origine, iata} : base de l'index de recherche des gares."""
        cursor = await self._col.aggregate(
            [{"$group": {"_id": {"origine": "$origine", "iata": "$origine_iata"}}}]
        )
        rows = await cursor.to_list(None)
        return [{"origine": r["_id"].get("origine"), "iata": r["_id"].get("iata")} for r in rows]
