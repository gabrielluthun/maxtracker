from typing import List

from fastapi import APIRouter, Query

from app.dependencies import SearchServiceDep
from app.schemas.trips import StationSuggestion

router = APIRouter(prefix="/stations", tags=["stations"])


@router.get("/search", response_model=List[StationSuggestion])
async def search_stations(
    search_service: SearchServiceDep,
    q: str = "",
    limit: int = Query(15, ge=1, le=50),
):
    return await search_service.search_stations(q, limit=limit)
