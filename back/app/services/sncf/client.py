"""SNCF Open Data HTTP client."""
import logging
from datetime import datetime, timedelta

import httpx

from app.config import Settings
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
