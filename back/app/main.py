"""FastAPI application factory."""
import asyncio
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.core.logging import setup_logging
from app.core.rate_limit import RateLimiter
from app.db.mongodb import Database
from app.db.repositories.search_cache import SearchCacheRepository
from app.db.repositories.sync_state import SyncStateRepository
from app.db.repositories.trips import TripsRepository
from app.services.search import SearchService
from app.services.sncf.client import SncfClient
from app.services.sync import SyncService

logger = setup_logging()


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
    scheduler.start()
    app.state.scheduler = scheduler

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
        allow_credentials=True,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


app = create_app()
