"""Aggregate API routes."""
from fastapi import APIRouter

from app.api.routes import health, search, stations, sync

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(sync.router)
api_router.include_router(stations.router)
api_router.include_router(search.router)
