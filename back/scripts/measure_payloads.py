"""Mesure la taille des réponses /search par niveau de correspondances.

Outil de diagnostic temporaire. Se connecte à la base définie par
MONGO_URL / DB_NAME (mêmes variables que l'app) et, pour chaque origine,
décompose la taille du payload JSON selon le type de trajet :
  - direct  : trajets directs uniquement
  - +1 corr : direct + parcours à 1 correspondance (2 segments)
  - +2 corr : direct + 1 + 2 correspondances (3 segments)

La limite stricte d'un document MongoDB est de 16 Mo.

Deux modes :
  - sans argument  -> scanne TOUTES les origines réelles de la base et donne
                      l'agrégat par niveau (total cache, plus gros, nb > 16 Mo).
  - avec arguments -> détail pour les origines passées en argument.

Usage (depuis back/):
    .venv/bin/python scripts/measure_payloads.py
    .venv/bin/python scripts/measure_payloads.py PARIS "AVIGNON TGV" GRENOBLE
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.db.mongodb import Database  # noqa: E402
from app.db.repositories.search_cache import SearchCacheRepository  # noqa: E402
from app.db.repositories.sync_state import SyncStateRepository  # noqa: E402
from app.db.repositories.trips import TripsRepository  # noqa: E402
from app.services.search import SearchService  # noqa: E402
from app.services.sncf.client import SncfClient  # noqa: E402

MONGO_DOCUMENT_LIMIT_BYTES = 16 * 1024 * 1024  # limite d'un document BSON
MEASURE_CONCURRENCY = 8
MAX_ROWS_DISPLAYED = 45

DIRECT_ONLY = 0
WITH_ONE_CONNECTION = 1
WITH_TWO_CONNECTIONS = 2


def format_size(num_bytes: float) -> str:
    for unit in ("o", "Ko", "Mo", "Go"):
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} To"


def payload_size_for_level(full_payload: dict, max_connection_level: int) -> int:
    """Taille JSON en ne gardant que les correspondances de degré <= niveau.

    niveau 0 = direct seul, 1 = + 1 correspondance, 2 = tout.
    """
    trimmed_payload = {**full_payload, "groups": []}
    for group in full_payload["groups"]:
        if max_connection_level == DIRECT_ONLY:
            kept_connections = []
        else:
            kept_connections = [
                connected
                for connected in group["connected_trips"]
                if connected.get("connection_count", 1) <= max_connection_level
            ]
        trimmed_payload["groups"].append({**group, "connected_trips": kept_connections})
    return len(json.dumps(trimmed_payload).encode("utf-8"))


async def measure_origin(search_service: SearchService, origin: str, is_metropolis: bool) -> dict:
    display_name = ("[metro] " if is_metropolis else "") + origin
    try:
        response = await search_service._compute_search_response(origin, fresh_prices=False)
    except Exception as error:  # noqa: BLE001
        return {"display_name": display_name, "error": str(error)}

    full_payload = response.model_dump(mode="json")
    groups = full_payload["groups"]
    direct_count = sum(len(group["trips"]) for group in groups)
    one_connection_count = sum(
        1
        for group in groups
        for connected in group["connected_trips"]
        if connected.get("connection_count", 1) == 1
    )
    two_connection_count = sum(
        1
        for group in groups
        for connected in group["connected_trips"]
        if connected.get("connection_count", 1) == 2
    )
    return {
        "display_name": display_name,
        "destination_count": len(groups),
        "direct_count": direct_count,
        "one_connection_count": one_connection_count,
        "two_connection_count": two_connection_count,
        "size_direct_only": payload_size_for_level(full_payload, DIRECT_ONLY),
        "size_with_one_connection": payload_size_for_level(full_payload, WITH_ONE_CONNECTION),
        "size_with_two_connections": payload_size_for_level(full_payload, WITH_TWO_CONNECTIONS),
        "error": None,
    }


async def main() -> None:
    settings = get_settings()
    database = Database(settings)

    trips_repo = TripsRepository(database.trips)
    sync_repo = SyncStateRepository(database.sync_state)
    cache_repo = SearchCacheRepository(database.search_cache)
    sncf_client = SncfClient(settings)
    search_service = SearchService(settings, trips_repo, sync_repo, sncf_client, cache_repo)

    total_trips = await trips_repo.count()

    requested_origins = sys.argv[1:]
    if requested_origins:
        origins_to_measure = [(origin, False) for origin in requested_origins]
    else:
        station_origins = sorted(set(await trips_repo.distinct_origines_norm()))
        metropolis_origins = sorted(set(await trips_repo.distinct_origine_metropolis()))
        origins_to_measure = (
            [(origin, False) for origin in station_origins]
            + [(metropolis, True) for metropolis in metropolis_origins]
        )

    print(f"Base: {settings.db_name} — {total_trips} trajets — {len(origins_to_measure)} origines")
    print("(calcul en cours…)\n", file=sys.stderr)

    semaphore = asyncio.Semaphore(MEASURE_CONCURRENCY)
    completed = 0

    async def measure_with_limit(origin: str, is_metropolis: bool) -> dict:
        nonlocal completed
        async with semaphore:
            result = await measure_origin(search_service, origin, is_metropolis)
            completed += 1
            if completed % 25 == 0:
                print(f"  … {completed}/{len(origins_to_measure)}", file=sys.stderr)
            return result

    results = await asyncio.gather(
        *(measure_with_limit(origin, is_metropolis) for origin, is_metropolis in origins_to_measure)
    )
    successful_results = [r for r in results if r.get("error") is None]
    failed_results = [r for r in results if r.get("error") is not None]

    # Détail par origine, trié par taille complète (+2 corr) décroissante.
    successful_results.sort(key=lambda r: r["size_with_two_connections"], reverse=True)
    header = (
        f"{'origine':<34} | {'direct':>9} {'+1corr':>9} {'+2corr':>9} | "
        f"{'nb dir':>6} {'nb c1':>6} {'nb c2':>6}"
    )
    print(header)
    print("-" * 100)
    for result in successful_results[:MAX_ROWS_DISPLAYED]:
        print(
            f"{result['display_name']:<34} | "
            f"{format_size(result['size_direct_only']):>9} "
            f"{format_size(result['size_with_one_connection']):>9} "
            f"{format_size(result['size_with_two_connections']):>9} | "
            f"{result['direct_count']:>6} {result['one_connection_count']:>6} "
            f"{result['two_connection_count']:>6}"
        )

    if successful_results:

        def format_level_stats(size_field: str) -> str:
            sizes = [result[size_field] for result in successful_results]
            over_limit_count = sum(1 for size in sizes if size > MONGO_DOCUMENT_LIMIT_BYTES)
            return (
                f"total={format_size(sum(sizes)):>9}  "
                f"max={format_size(max(sizes)):>9}  "
                f">16Mo={over_limit_count:>3}"
            )

        print("\n=== Agrégat sur toutes les origines mesurées ===")
        print(f"Origines: {len(successful_results)}  (erreurs: {len(failed_results)})")
        print(f"  direct seul   : {format_level_stats('size_direct_only')}")
        print(f"  + 1 corresp.  : {format_level_stats('size_with_one_connection')}")
        print(f"  + 2 corresp.  : {format_level_stats('size_with_two_connections')}")

    if failed_results:
        print("\nErreurs:")
        for result in failed_results[:10]:
            print(f"  - {result['display_name']}: {result['error']}")

    await database.close()


if __name__ == "__main__":
    asyncio.run(main())
