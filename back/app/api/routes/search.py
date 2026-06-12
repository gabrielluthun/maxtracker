from fastapi import APIRouter, HTTPException, Request

from app.core.rate_limit import RateLimitExceeded
from app.dependencies import SearchServiceDep
from app.schemas.trips import SearchResponse

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
async def search_trips(
    request: Request,
    search_service: SearchServiceDep,
    origin: str = "",
):
    if not origin or not origin.strip():
        raise HTTPException(status_code=400, detail="Aucune gare de départ sélectionnée")

    ip = request.client.host if request.client else "anon"
    try:
        return await search_service.search_trips(origin.strip(), client_ip=ip)
    except RateLimitExceeded:
        raise HTTPException(
            status_code=429,
            detail="Trop de recherches. Réessayez dans une minute.",
        )
