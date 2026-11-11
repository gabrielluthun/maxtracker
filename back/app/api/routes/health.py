import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request, Response

from app.dependencies import SettingsDep, SyncRepoDep

router = APIRouter(tags=["health"])
logger = logging.getLogger("maxtracker")

MONGO_PING_TIMEOUT_SECONDS = 2.0
# La SNCF publie une fois par jour : au-delà, la publication du jour manque.
SNCF_DATA_MAX_AGE_HOURS = 36
# Sans tentative de sync depuis 3 intervalles, le planificateur est bloqué.
MISSED_SYNC_INTERVALS = 3


@router.get("/")
async def root():
    return {"app": "MaxTracker", "status": "ok"}


def _age_minutes(iso: Optional[str], now: datetime) -> Optional[float]:
    if not iso:
        return None
    try:
        then = datetime.fromisoformat(iso)
    except ValueError:
        return None
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return round((now - then).total_seconds() / 60, 1)


@router.get("/health")
async def health(request: Request, response: Response, sync_repo: SyncRepoDep, settings: SettingsDep):
    """État pour la supervision : 200 si ok ou dégradé, 503 si le service est hors d'usage.

    - down : MongoDB injoignable, ou aucune tentative de sync depuis 3 intervalles ;
    - degraded : dernière sync en erreur, ou données SNCF de plus de 36 h.
    N'appelle jamais l'API SNCF.
    """
    now = datetime.now(timezone.utc)
    problems: list[str] = []
    down = False

    try:
        await asyncio.wait_for(request.app.state.db.ping(), MONGO_PING_TIMEOUT_SECONDS)
        mongo = "ok"
    except Exception as exc:  # noqa: BLE001 — tout échec = base indisponible
        logger.warning("health: MongoDB unreachable: %s", exc)
        mongo = "error"
        down = True
        problems.append("MongoDB injoignable")

    state: dict = {}
    if mongo == "ok":
        state = await sync_repo.get()

    attempt_age = _age_minutes(state.get("last_attempt_at") or state.get("last_sync_at"), now)
    sncf_age = _age_minutes(state.get("sncf_data_updated_at"), now)
    max_attempt_age = MISSED_SYNC_INTERVALS * settings.sync_interval_min

    if mongo == "ok":
        if attempt_age is None or attempt_age > max_attempt_age:
            down = True
            problems.append(f"aucune tentative de synchronisation depuis plus de {max_attempt_age} min")
        if state.get("last_sync_status") == "error":
            problems.append("dernière synchronisation en erreur")
        if sncf_age is not None and sncf_age > SNCF_DATA_MAX_AGE_HOURS * 60:
            problems.append(f"données SNCF de plus de {SNCF_DATA_MAX_AGE_HOURS} h")

    status = "down" if down else ("degraded" if problems else "ok")
    if down:
        response.status_code = 503
    return {
        "status": status,
        "mongo": mongo,
        "last_sync_status": state.get("last_sync_status"),
        "last_attempt_at": state.get("last_attempt_at"),
        "last_attempt_age_minutes": attempt_age,
        "sncf_data_updated_at": state.get("sncf_data_updated_at"),
        "sncf_data_age_hours": None if sncf_age is None else round(sncf_age / 60, 1),
        "total_trips": state.get("total_trips"),
        "problems": problems,
    }
