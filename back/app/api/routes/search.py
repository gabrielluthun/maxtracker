import gzip

from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.core.rate_limit import RateLimitExceeded
from app.dependencies import SearchServiceDep
from app.schemas.trips import SearchResponse

router = APIRouter(tags=["search"])


def accepts_gzip(accept_encoding: str) -> bool:
    """True si l'en-tête Accept-Encoding autorise gzip (q > 0)."""
    for part in (accept_encoding or "").split(","):
        token, _, params = part.strip().partition(";")
        if token.strip().lower() not in ("gzip", "*"):
            continue
        params = params.strip().replace(" ", "")
        if params.startswith("q="):
            try:
                return float(params[2:]) > 0
            except ValueError:
                return True
        return True
    return False


@router.get("/search", response_model=SearchResponse)
async def search_trips(
    request: Request,
    search_service: SearchServiceDep,
    origin: str = "",
    connections: bool = Query(
        True,
        description="Inclure les parcours avec correspondance (false : directs seuls, ~6× plus léger).",
    ),
    compact: bool = Query(
        False,
        description=(
            "Omettre les champs recalculables côté client : sncf_connect_url, id, "
            "fare_eur, price_checked_at, departure_datetime, destination_metropolis."
        ),
    ),
):
    if not origin or not origin.strip():
        raise HTTPException(status_code=400, detail="Aucune gare de départ sélectionnée")

    ip = request.client.host if request.client else "anon"
    try:
        body = await search_service.search_gzip(
            origin.strip(), client_ip=ip, connections=connections, compact=compact
        )
    except RateLimitExceeded:
        raise HTTPException(
            status_code=429,
            detail="Trop de recherches. Réessayez dans une minute.",
        )

    headers = {"Vary": "Accept-Encoding"}
    if accepts_gzip(request.headers.get("accept-encoding", "")):
        # Déjà compressé : GZipMiddleware laisse passer les réponses avec Content-Encoding.
        headers["Content-Encoding"] = "gzip"
        return Response(content=body, media_type="application/json", headers=headers)
    return Response(content=gzip.decompress(body), media_type="application/json", headers=headers)
