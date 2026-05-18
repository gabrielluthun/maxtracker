"""SNCF Open Data HTTP client."""
import logging
from collections import defaultdict
from datetime import datetime, timedelta

import httpx

from app.config import Settings
from app.domain.stations import trip_id
from app.domain.trips import PARIS_TZ

logger = logging.getLogger("maxtracker")


class SncfClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def fetch_dataset_updated_at(self) -> str | None:
        try:
            async with httpx.AsyncClient(timeout=15.0) as http:
                r = await http.get(self._settings.sncf_dataset_meta_url)
                r.raise_for_status()
                default_meta = (r.json().get("metas") or {}).get("default") or {}
                return default_meta.get("data_processed") or default_meta.get("modified")
        except Exception as exc:
            logger.warning("SNCF dataset metadata fetch failed: %s", exc)
            return None

    async def fetch_export(self) -> list[dict] | None:
        today = datetime.now(PARIS_TZ).date()
        future = today + timedelta(days=30)
        where = (
            f'od_happy_card="OUI" AND date>="{today.isoformat()}" '
            f'AND date<="{future.isoformat()}"'
        )
        params = {"where": where, "limit": -1}
        try:
            async with httpx.AsyncClient(timeout=120.0) as http:
                r = await http.get(self._settings.sncf_export_url, params=params)
                r.raise_for_status()
                return r.json()
        except Exception as exc:
            logger.error("SNCF fetch failed: %s", exc)
            return None

    async def fetch_live_eligible_keys(self, trips: list[dict]) -> set[str]:
        """Revalide od_happy_card auprès de l'API SNCF (temps réel)."""
        if not trips:
            return set()

        settings = self._settings
        by_date: dict[str, set[str]] = defaultdict(set)
        for t in trips:
            by_date[t["date"]].add(t["train_no"])

        eligible: set[str] = set()
        try:
            async with httpx.AsyncClient(timeout=45.0) as http:
                for date, train_nos in by_date.items():
                    nos = list(train_nos)[: settings.live_fare_check_max_trains]
                    for i in range(0, len(nos), 40):
                        chunk = nos[i : i + 40]
                        in_clause = ",".join(f'"{n}"' for n in chunk)
                        where = (
                            f'date >= "{date}" AND date <= "{date}" '
                            f'AND train_no IN ({in_clause}) AND od_happy_card="OUI"'
                        )
                        offset = 0
                        while True:
                            params = {
                                "where": where,
                                "limit": settings.sncf_records_page_limit,
                                "offset": offset,
                            }
                            r = await http.get(settings.sncf_records_url, params=params)
                            r.raise_for_status()
                            payload = r.json()
                            rows = payload.get("results", [])
                            for row in rows:
                                if row.get("od_happy_card") != "OUI":
                                    continue
                                eligible.add(
                                    trip_id(
                                        row.get("train_no", ""),
                                        row.get("date", ""),
                                        row.get("origine", ""),
                                        row.get("destination", ""),
                                    )
                                )
                            total = payload.get("total_count", 0)
                            offset += len(rows)
                            if not rows or offset >= total:
                                break
        except Exception as exc:
            logger.warning("Live fare check failed, using cached eligibility: %s", exc)
            return {
                trip_id(t["train_no"], t["date"], t["origine"], t["destination"])
                for t in trips
            }

        return eligible
