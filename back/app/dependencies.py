"""FastAPI dependency injection."""
from typing import Annotated

from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.core.rate_limit import RateLimiter
from app.db.repositories.sync_state import SyncStateRepository
from app.db.repositories.trips import TripsRepository
from app.services.search import SearchService
from app.services.sncf.client import SncfClient
from app.services.sync import SyncService


def get_db(request: Request):
    return request.app.state.db


def get_trips_repo(request: Request) -> TripsRepository:
    return request.app.state.trips_repo


def get_sync_repo(request: Request) -> SyncStateRepository:
    return request.app.state.sync_repo


def get_sncf_client(request: Request) -> SncfClient:
    return request.app.state.sncf_client


def get_sync_service(request: Request) -> SyncService:
    return request.app.state.sync_service


def get_search_service(request: Request) -> SearchService:
    return request.app.state.search_service


def get_rate_limiter(request: Request) -> RateLimiter:
    return request.app.state.rate_limiter


SettingsDep = Annotated[Settings, Depends(get_settings)]
TripsRepoDep = Annotated[TripsRepository, Depends(get_trips_repo)]
SyncRepoDep = Annotated[SyncStateRepository, Depends(get_sync_repo)]
SncfClientDep = Annotated[SncfClient, Depends(get_sncf_client)]
SyncServiceDep = Annotated[SyncService, Depends(get_sync_service)]
SearchServiceDep = Annotated[SearchService, Depends(get_search_service)]
RateLimiterDep = Annotated[RateLimiter, Depends(get_rate_limiter)]
