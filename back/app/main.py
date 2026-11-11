"""FastAPI application factory."""
import asyncio
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.core.logging import setup_logging
from app.core.rate_limit import RateLimiter
from app.db.mongodb import Database
from app.db.repositories.search_cache import SearchCacheRepository
from app.db.repositories.sync_state import SyncStateRepository
from app.db.repositories.trips import TripsRepository
from app.domain.station_labels import refresh_trigramme_map_if_stale
from app.services.search import SearchService
from app.services.sncf.client import SncfClient
from app.services.sync import SyncService

logger = setup_logging()

# Niveau 6 : ~28× plus léger sur /search Paris (17,7 Mo → 638 Ko) pour ~75 ms CPU,
# contre ~135 ms au niveau 9 (défaut Starlette) pour seulement 8 % de gain.
GZIP_MIN_SIZE_BYTES = 1024
GZIP_COMPRESS_LEVEL = 6


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    db = Database(settings)
    await db.ensure_indexes()

    trips_repo = TripsRepository(db.trips)
    sync_repo = SyncStateRepository(db.sync_state)
    search_cache_repo = SearchCacheRepository(db.search_cache)
    sncf_client = SncfClient(settings)
    rate_limiter = RateLimiter(settings.rate_limit_per_min)
    search_service = SearchService(
        settings, trips_repo, sync_repo, sncf_client, search_cache_repo, rate_limiter
    )
    sync_service = SyncService(
        settings, trips_repo, sync_repo, sncf_client, search_service
    )

    app.state.db = db
    app.state.trips_repo = trips_repo
    app.state.sync_repo = sync_repo
    app.state.sncf_client = sncf_client
    app.state.sync_service = sync_service
    app.state.search_service = search_service
    app.state.rate_limiter = rate_limiter

    scheduler = AsyncIOScheduler(timezone="Europe/Paris")
    scheduler.add_job(
        sync_service.sync_trips,
        "interval",
        minutes=settings.sync_interval_min,
        id="sync_job",
        max_instances=1,
    )
    scheduler.add_job(
        sync_service.cleanup_past_trips,
        "interval",
        minutes=5,
        id="cleanup_job",
        max_instances=1,
    )
    # Réessaie toutes les 30 min si le chargement a échoué ; sinon 1 fois / 24 h.
    scheduler.add_job(
        refresh_trigramme_map_if_stale,
        "interval",
        minutes=30,
        id="station_labels_job",
        max_instances=1,
    )
    scheduler.start()
    app.state.scheduler = scheduler

    # En arrière-plan : ne retarde pas le démarrage si data.sncf.com est lent.
    app.state.station_labels_task = asyncio.create_task(refresh_trigramme_map_if_stale())

    if await trips_repo.count() == 0:
        asyncio.create_task(sync_service.sync_trips())

    asyncio.create_task(search_service.hydrate_memory_from_mongo())

    yield

    scheduler.shutdown(wait=False)
    await db.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="MaxTracker API", lifespan=lifespan)
    app.include_router(api_router)
    app.add_middleware(
        CORSMiddleware,
        # Aucune requête du front n'envoie de cookie : pas de CORS « avec identifiants ».
        allow_credentials=False,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        # Lisible par le front en cross-origin (dev local) après un 429.
        expose_headers=["Retry-After"],
    )
    app.add_middleware(
        GZipMiddleware,
        minimum_size=GZIP_MIN_SIZE_BYTES,
        compresslevel=GZIP_COMPRESS_LEVEL,
    )
    return app


app = create_app()
