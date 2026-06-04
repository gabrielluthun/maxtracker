"""Trip search and station autocomplete."""
import asyncio
import logging
from datetime import datetime, timezone

from app.config import Settings
from app.db.repositories.search_cache import SearchCacheRepository
from app.db.repositories.sync_state import SyncStateRepository
from app.db.repositories.trips import TripsRepository
from app.domain.connections import (
    compose_connected_journeys,
    direct_trip_fingerprint,
    find_all_connected_journeys,
    hub_date_keys_from_outbound,
    hub_date_keys_from_two_leg_journeys,
    merge_hub_departure_docs,
    segment_from_trip_doc,
)
from app.domain.stations import (
    is_metropolis_query,
    metropolis_for,
    metropolis_label,
    normalize_station,
    trip_id,
)
from app.domain.trips import departure_passed
from app.schemas.trips import (
    ConnectedTripOut,
    DestinationGroup,
    SearchResponse,
    StationSuggestion,
    TripOut,
)
from app.services.connection_search import merge_connected_into_groups
from app.services.sncf.client import SncfClient
from app.services.sncf.connect import build_sncf_connect_url

logger = logging.getLogger("maxtracker")

# Concurrence du pré-calcul de cache (nb d'origines calculées en parallèle).
CACHE_WARM_CONCURRENCY = 8


class SearchService:
    def __init__(
        self,
        settings: Settings,
        trips_repo: TripsRepository,
        sync_repo: SyncStateRepository,
        sncf: SncfClient,
        cache_repo: SearchCacheRepository,
    ) -> None:
        self._settings = settings
        self._trips = trips_repo
        self._sync = sync_repo
        self._sncf = sncf
        self._cache = cache_repo
        # Recalculs de cache déclenchés en arrière-plan (stale-while-revalidate).
        # _refresh_keys : dédup par origine ; _refresh_tasks : garde une réf forte
        # aux tâches pour éviter leur ramassage prématuré par le GC.
        self._refresh_keys: set[str] = set()
        self._refresh_tasks: set[asyncio.Task] = set()

    async def search_stations(self, q: str, *, limit: int = 15) -> list[StationSuggestion]:
        q = (q or "").strip()
        if len(q) < 3:
            return []
        qn = normalize_station(q)
        names = await self._trips.search_origines(qn, limit=limit)
        suggestions: list[StationSuggestion] = []
        seen_metros: set[str] = set()
        for name in names:
            norm = normalize_station(name)
            metro = metropolis_for(norm)
            if metro and metro not in seen_metros:
                seen_metros.add(metro)
                suggestions.append(
                    StationSuggestion(name=metro + " (toutes gares)", raw=metro, is_metropolis=True)
                )
            suggestions.append(
                StationSuggestion(name=name.title(), raw=name, is_metropolis=False)
            )
            if len(suggestions) >= limit:
                break
        return suggestions[:limit]

    def _origin_metropolis(self, origin_clean: str, origin_norm: str, is_metro: bool) -> str | None:
        if is_metro:
            return metropolis_label(origin_clean, origin_norm)
        return metropolis_for(origin_norm)

    def _trip_out(self, t: dict, *, price_checked_at: str) -> TripOut:
        return TripOut(
            id=trip_id(t["train_no"], t["date"], t["origine"], t["destination"]),
            train_no=t["train_no"],
            date=t["date"],
            origine=t["origine"],
            destination=t["destination"],
            origine_iata=t.get("origine_iata"),
            destination_iata=t.get("destination_iata"),
            heure_depart=t["heure_depart"],
            heure_arrivee=t["heure_arrivee"],
            axe=t.get("axe") or "",
            train_type=t["train_type"],
            fare_eur=float(t.get("fare_eur", 0.0)),
            price_checked_at=price_checked_at,
            sncf_connect_url=build_sncf_connect_url(
                self._settings,
                t.get("origine_iata", ""),
                t.get("destination_iata", ""),
                t["date"],
                t["heure_depart"],
                t.get("origine", ""),
                t.get("destination", ""),
            ),
            destination_metropolis=t.get("destination_metropolis"),
            departure_datetime=t["departure_datetime"],
        )

    def _build_destination_groups(
        self,
        grouped: dict[str, dict],
        *,
        price_checked_at: str,
    ) -> list[DestinationGroup]:
        groups_out: list[DestinationGroup] = []
        for key, g in grouped.items():
            trips_out = [self._trip_out(t, price_checked_at=price_checked_at) for t in g["trips"]]
            trips_out.sort(key=lambda x: x.departure_datetime)
            connected: list[ConnectedTripOut] = g.get("connected_trips", [])
            connected.sort(key=lambda x: x.departure_datetime)
            count = len(trips_out) + len(connected)
            groups_out.append(
                DestinationGroup(
                    destination_city=key,
                    destinations=sorted(g["destinations"]),
                    trip_count=count,
                    trips=trips_out,
                    connected_trips=connected,
                )
            )
        groups_out.sort(key=lambda x: (-x.trip_count, x.destination_city))
        return groups_out

    def _cache_key(self, origin: str) -> str:
        """Clé canonique d'une origine (identique entre warming et requête)."""
        origin_clean = origin.strip()
        origin_norm = normalize_station(origin_clean)
        if is_metropolis_query(origin_clean, origin_norm):
            return "metro:" + metropolis_label(origin_clean, origin_norm)
        return "norm:" + origin_norm

    async def search_trips(
        self,
        origin: str,
        *,
        fresh_prices: bool = False,
    ) -> SearchResponse:
        # fresh_prices = re-contrôle live SNCF : jamais servi depuis le cache.
        if fresh_prices:
            return await self._compute_search_response(origin, fresh_prices=True)

        last_sync = await self._sync.get_last_sync_at()
        key = self._cache_key(origin)
        cached = await self._cache.get(key)

        # Stale-while-revalidate : si une réponse existe en cache, on la sert
        # immédiatement, même si elle date d'une sync antérieure. Le calcul lourd
        # (~30 s sur les grandes origines) ne doit jamais bloquer la requête.
        if cached:
            if last_sync is not None and cached.get("sync_at") != last_sync:
                self._schedule_refresh(origin, key)
            payload = {**cached["payload"], "origin": origin.strip()}
            return SearchResponse(**payload)

        # Démarrage à froid : aucune entrée en cache (origine jamais réchauffée).
        # Le calcul synchrone est ici inévitable, mais le résultat est ensuite mis
        # en cache pour toutes les requêtes suivantes.
        resp = await self._compute_search_response(origin, fresh_prices=False)
        try:
            await self._cache.set(
                key, resp.model_dump(mode="json"), sync_at=resp.last_sync_at
            )
        except Exception:
            # Ne jamais faire échouer la requête à cause de la mise en cache
            # (ex. payload dépassant la limite de 16 Mo d'un document Mongo).
            logger.exception("Cache set failed for origin %r", origin)
        return resp

    def _schedule_refresh(self, origin: str, key: str) -> None:
        """Planifie un recalcul de cache en tâche de fond (dédupliqué par clé)."""
        if key in self._refresh_keys:
            return
        self._refresh_keys.add(key)
        task = asyncio.create_task(self._refresh_entry(origin, key))
        self._refresh_tasks.add(task)
        task.add_done_callback(self._refresh_tasks.discard)

    async def _refresh_entry(self, origin: str, key: str) -> None:
        try:
            resp = await self._compute_search_response(origin, fresh_prices=False)
            await self._cache.set(
                key, resp.model_dump(mode="json"), sync_at=resp.last_sync_at
            )
        except Exception:
            logger.exception("Background cache refresh failed for origin %r", origin)
        finally:
            self._refresh_keys.discard(key)

    async def warm_cache(self) -> int:
        """Pré-calcule la réponse /search de chaque origine après une sync."""
        last_sync = await self._sync.get_last_sync_at()
        norms = await self._trips.distinct_origines_norm()
        metros = await self._trips.distinct_origine_metropolis()
        origins = list(norms) + list(metros)
        if not origins:
            return 0

        sem = asyncio.Semaphore(CACHE_WARM_CONCURRENCY)
        count = 0

        async def warm_one(origin: str) -> None:
            nonlocal count
            async with sem:
                try:
                    resp = await self._compute_search_response(origin, fresh_prices=False)
                    await self._cache.set(
                        self._cache_key(origin),
                        resp.model_dump(mode="json"),
                        sync_at=last_sync,
                    )
                    count += 1
                except Exception:
                    logger.exception("Cache warm failed for origin %r", origin)

        await asyncio.gather(*(warm_one(o) for o in origins))
        removed = await self._cache.prune(keep_sync_at=last_sync)
        logger.info("Cache warmed: %d origins, %d stale entries pruned", count, removed)
        return count

    async def _compute_search_response(
        self,
        origin: str,
        *,
        fresh_prices: bool = False,
    ) -> SearchResponse:
        origin_clean = origin.strip()
        origin_norm = normalize_station(origin_clean)
        is_metro = is_metropolis_query(origin_clean, origin_norm)
        origin_metropolis = self._origin_metropolis(origin_clean, origin_norm, is_metro)

        if is_metro:
            query = {"origine_metropolis": metropolis_label(origin_clean, origin_norm)}
        else:
            query = {"origine_norm": origin_norm}

        last_sync = await self._sync.get_last_sync_at()
        raw = await self._trips.find_by_query(query, limit=self._settings.search_result_limit)
        raw = [t for t in raw if not departure_passed(t["date"], t["heure_depart"])]

        price_checked_at = datetime.now(timezone.utc).isoformat()

        hub_keys = hub_date_keys_from_outbound(
            raw, origin_metropolis=origin_metropolis
        )
        hub_raw: list[dict] = []
        if hub_keys:
            hub_raw = await self._trips.find_departures_from_hub_date_keys(
                hub_keys,
                limit=self._settings.search_result_limit,
            )
            hub_raw = [
                t for t in hub_raw if not departure_passed(t["date"], t["heure_depart"])
            ]
            if raw and hub_raw:
                preview = find_all_connected_journeys(
                    [segment_from_trip_doc(t) for t in raw],
                    [segment_from_trip_doc(t) for t in hub_raw],
                    origin_metropolis=origin_metropolis,
                    max_connections=1,
                )
                extra_keys = hub_date_keys_from_two_leg_journeys(preview)
                missing = extra_keys - hub_keys
                if missing:
                    hub_raw_2 = await self._trips.find_departures_from_hub_date_keys(
                        missing,
                        limit=self._settings.search_result_limit,
                    )
                    hub_raw_2 = [
                        t
                        for t in hub_raw_2
                        if not departure_passed(t["date"], t["heure_depart"])
                    ]
                    hub_raw = merge_hub_departure_docs(hub_raw, hub_raw_2)

        pool_for_live = raw + hub_raw
        if pool_for_live and fresh_prices:
            live_keys = await self._sncf.fetch_live_eligible_keys(pool_for_live)
            raw = [
                t
                for t in raw
                if trip_id(t["train_no"], t["date"], t["origine"], t["destination"]) in live_keys
            ]
            hub_raw = [
                t
                for t in hub_raw
                if trip_id(t["train_no"], t["date"], t["origine"], t["destination"]) in live_keys
            ]

        if not raw and not hub_raw:
            served = True
            if not is_metro:
                served = await self._trips.exists_with_origine_norm(origin_norm)
            return SearchResponse(
                origin=origin_clean,
                total_trips=0,
                groups=[],
                last_sync_at=last_sync,
                served=served,
            )

        grouped: dict[str, dict] = {}
        for t in raw:
            dest_metro = t.get("destination_metropolis")
            dest = t.get("destination") or ""
            key = dest_metro if dest_metro else dest
            g = grouped.setdefault(
                key,
                {
                    "destinations": set(),
                    "trips": [],
                    "connected_trips": [],
                    "seen_direct": set(),
                    "seen_connected": set(),
                },
            )
            fp = direct_trip_fingerprint(t)
            if fp in g["seen_direct"]:
                continue
            g["seen_direct"].add(fp)
            g["destinations"].add(dest)
            g["trips"].append(t)

        if raw and hub_raw:
            journeys = compose_connected_journeys(
                raw,
                hub_raw,
                origin_metropolis=origin_metropolis,
            )
            merge_connected_into_groups(
                grouped,
                journeys,
                sncf_connect_base=self._settings.sncf_connect_base,
                price_checked_at=price_checked_at,
            )

        groups_out = self._build_destination_groups(
            grouped, price_checked_at=price_checked_at
        )
        total = sum(g.trip_count for g in groups_out)
        return SearchResponse(
            origin=origin_clean,
            total_trips=total,
            groups=groups_out,
            last_sync_at=last_sync,
            served=True,
        )
