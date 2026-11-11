"""SNCF → MongoDB sync pipeline."""
import asyncio
import logging
import math
import time
from datetime import datetime, timedelta, timezone

from app.config import Settings
from app.db.repositories.sync_state import SyncStateRepository
from app.db.repositories.trips import TripsRepository
from app.domain.stations import metropolis_for, normalize_station, trip_id
from app.domain.train_classifier import classify_train_type
from app.domain.trips import PARIS_TZ, paris_cleanup_cutoff
from app.services.sncf.client import SncfClient

logger = logging.getLogger("maxtracker")

# Une sync forcée retélécharge tout l'export SNCF et recalcule le cache de
# toutes les origines : c'est une opération globale, limitée pour tout le monde.
MANUAL_SYNC_COOLDOWN_SECONDS = 180


class SyncCooldown(Exception):
    """Une sync manuelle a été lancée trop récemment."""

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__(f"retry after {retry_after_seconds}s")
        self.retry_after_seconds = retry_after_seconds


class SyncService:
    def __init__(
        self,
        settings: Settings,
        trips_repo: TripsRepository,
        sync_repo: SyncStateRepository,
        sncf: SncfClient,
        search_service=None,
        *,
        manual_cooldown_seconds: int = MANUAL_SYNC_COOLDOWN_SECONDS,
        clock=time.monotonic,
    ) -> None:
        self._settings = settings
        self._trips = trips_repo
        self._sync = sync_repo
        self._sncf = sncf
        self._search = search_service
        self._warm_task: asyncio.Task | None = None
        self._warm_generation = 0
        self._lock = asyncio.Lock()
        self._manual_cooldown_seconds = manual_cooldown_seconds
        self._clock = clock
        self._last_manual_at: float | None = None

    def manual_sync_retry_after(self) -> int:
        """Secondes restantes avant d'accepter une nouvelle sync manuelle (0 = possible)."""
        if self._last_manual_at is None:
            return 0
        remaining = self._manual_cooldown_seconds - (self._clock() - self._last_manual_at)
        return max(0, math.ceil(remaining))

    async def trigger_manual_sync(self) -> dict:
        """Sync forcée déclenchée par un utilisateur ; lève SyncCooldown si trop récente."""
        retry_after = self.manual_sync_retry_after()
        if retry_after > 0:
            raise SyncCooldown(retry_after)
        self._last_manual_at = self._clock()
        return await self.sync_trips(force=True)

    async def sync_trips(self, *, force: bool = False) -> dict:
        # Pas d'await entre le test et l'acquisition : pas de course possible.
        if self._lock.locked():
            logger.info("SNCF sync already running — skip (force=%s)", force)
            return {"status": "skipped", "reason": "sync_in_progress"}
        async with self._lock:
            return await self._sync_trips_locked(force=force)

    async def _sync_trips_locked(self, *, force: bool) -> dict:
        started = datetime.now(timezone.utc)
        logger.info("Starting SNCF sync at %s force=%s", started.isoformat(), force)

        sncf_updated = await self._sncf.fetch_dataset_updated_at()
        previous_updated = await self._sync.get_sncf_data_updated_at()
        if (
            not force
            and sncf_updated is not None
            and previous_updated is not None
            and sncf_updated == previous_updated
        ):
            await self._sync.update({
                "last_sync_status": "skipped",
                "last_attempt_at": started.isoformat(),
            })
            logger.info("SNCF dataset unchanged (%s) — skip export and cache warm", sncf_updated)
            return {"status": "skipped", "reason": "sncf_unchanged"}

        data = await self._sncf.fetch_export()
        if data is None:
            await self._sync.update({
                "last_sync_status": "error",
                "last_error": "SNCF API unavailable - using cached data",
                "last_attempt_at": started.isoformat(),
            })
            return {"status": "error", "reason": "sncf_unavailable"}

        today_iso = datetime.now(PARIS_TZ).date().isoformat()
        future_iso = (datetime.now(PARIS_TZ).date() + timedelta(days=30)).isoformat()

        seen: set[str] = set()
        docs: list[dict] = []
        for row in data:
            if row.get("od_happy_card") != "OUI":
                continue
            date = row.get("date")
            train_no = row.get("train_no")
            origine = row.get("origine") or ""
            destination = row.get("destination") or ""
            if not (date and train_no and origine and destination):
                continue
            if date < today_iso or date > future_iso:
                continue
            tid = trip_id(train_no, date, origine, destination)
            if tid in seen:
                continue
            seen.add(tid)

            entity = row.get("entity") or ""
            heure_depart = row.get("heure_depart") or "00:00"
            heure_arrivee = row.get("heure_arrivee") or "00:00"
            axe = row.get("axe") or ""
            train_type = classify_train_type(entity, axe, origine, destination, train_no)
            if train_type is None:
                continue

            origine_norm = normalize_station(origine)
            destination_norm = normalize_station(destination)
            docs.append({
                "_id": tid,
                "train_no": train_no,
                "date": date,
                "entity": entity,
                "origine": origine,
                "destination": destination,
                "origine_norm": origine_norm,
                "destination_norm": destination_norm,
                "origine_iata": row.get("origine_iata") or "",
                "destination_iata": row.get("destination_iata") or "",
                "heure_depart": heure_depart,
                "heure_arrivee": heure_arrivee,
                "axe": axe,
                "train_type": train_type,
                "od_happy_card": row.get("od_happy_card") or "OUI",
                "fare_eur": 0.0,
                "origine_metropolis": metropolis_for(origine_norm),
                "destination_metropolis": metropolis_for(destination_norm),
                "departure_datetime": f"{date}T{heure_depart}:00",
                "synced_at": started.isoformat(),
            })

        await self._trips.replace_all(docs)
        today, cur_time = paris_cleanup_cutoff()
        await self._trips.cleanup_today_before(cur_time)

        total = await self._trips.count()
        finished = datetime.now(timezone.utc)
        if sncf_updated is None:
            sncf_updated = await self._sncf.fetch_dataset_updated_at()
        await self._sync.update({
            "last_sync_at": finished.isoformat(),
            "last_attempt_at": finished.isoformat(),
            "last_sync_status": "ok",
            "sncf_data_updated_at": sncf_updated,
            "total_trips": total,
            "last_error": None,
        })
        logger.info(
            "Sync done. Total trips: %d (duration %.1fs)",
            total,
            (finished - started).total_seconds(),
        )

        self._schedule_warm_cache()
        return {"status": "ok", "total": total}

    def _schedule_warm_cache(self) -> None:
        if self._search is None:
            return
        self._warm_generation += 1
        generation = self._warm_generation
        if self._warm_task is not None and not self._warm_task.done():
            logger.info("Cache warming already running — will restart after current pass")
            return
        self._warm_task = asyncio.create_task(self._warm_cache_background(generation))

    async def _warm_cache_background(self, generation: int) -> None:
        try:
            logger.info("Cache warming started in background")
            await self._search.warm_cache()
        except Exception:
            logger.exception("Cache warming failed after sync")
        finally:
            if generation != self._warm_generation:
                logger.info("A newer sync completed — restarting cache warm")
                self._warm_task = asyncio.create_task(
                    self._warm_cache_background(self._warm_generation)
                )

    async def cleanup_past_trips(self) -> int:
        removed = await self._trips.cleanup_past()
        if removed:
            logger.info("Cleanup removed %d past trips", removed)
        return removed
