from fastapi import APIRouter, HTTPException, Request

from app.dependencies import RateLimiterDep, SearchServiceDep
from app.schemas.trips import SearchResponse

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
async def search_trips(
    request: Request,
    search_service: SearchServiceDep,
    rate_limiter: RateLimiterDep,
    origin: str = "",
    hide_metropolis: bool = False,  # noqa: ARG001 — réservé usage futur
    fresh_prices: bool = False,
):
    """Find all eligible 0€ trips departing from `origin`.

    Le nettoyage des trajets passés est assuré par le job planifié (toutes les
    5 min) et n'est plus exécuté ici afin de garder ce chemin rapide / cacheable.
    """
    ip = request.client.host if request.client else "anon"
    if not rate_limiter.allow(ip):
        raise HTTPException(
            status_code=429,
            detail="Trop de recherches. Réessayez dans une minute.",
        )

    if not origin or not origin.strip():
        raise HTTPException(status_code=400, detail="Aucune gare de départ sélectionnée")

    return await search_service.search_trips(
        origin.strip(),
        fresh_prices=fresh_prices,
    )
