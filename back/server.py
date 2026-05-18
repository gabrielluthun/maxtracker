"""MaxTracker backend - TGV Max 0€ ticket search platform."""
import asyncio
import logging
import os
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from train_classifier import classify_train_type

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("maxtracker")

# ---------- MongoDB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
trips_col = db.trips
sync_col = db.sync_state

# ---------- App ----------
app = FastAPI(title="MaxTracker API")
api_router = APIRouter(prefix="/api")

# ---------- Constants ----------
SNCF_EXPORT_URL = "https://data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/exports/json"
SNCF_RECORDS_URL = "https://data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/records"
RATE_LIMIT_PER_MIN = 10
SYNC_INTERVAL_MIN = 15
LIVE_FARE_CHECK_MAX_TRAINS = 200

# Metropolis grouping: city normalized -> metropolis label
METROPOLIS_MAP = {
    "PARIS": "Paris",
    "LYON": "Lyon",
    "MARSEILLE": "Marseille",
    "LILLE": "Lille",
    "BORDEAUX": "Bordeaux",
    "NANTES": "Nantes",
    "STRASBOURG": "Strasbourg",
    "TOULOUSE": "Toulouse",
    "MONTPELLIER": "Montpellier",
    "RENNES": "Rennes",
    "NICE": "Nice",
    "GRENOBLE": "Grenoble",
    "DIJON": "Dijon",
    "TOURS": "Tours",
    "ANGERS": "Angers",
    "REIMS": "Reims",
    "METZ": "Metz",
    "NANCY": "Nancy",
}

# ---------- Rate Limiter (in-memory) ----------
rate_limit_store: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(ip: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    window = rate_limit_store[ip]
    # Drop old entries
    rate_limit_store[ip] = [t for t in window if now - t < 60]
    if len(rate_limit_store[ip]) >= RATE_LIMIT_PER_MIN:
        return False
    rate_limit_store[ip].append(now)
    return True


# ---------- Helpers ----------
def normalize_station(name: str) -> str:
    """Normalize station name (uppercase, no accents, trimmed)."""
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    only_ascii = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", only_ascii.upper()).strip()


def metropolis_for(station_normalized: str) -> Optional[str]:
    """Return metropolis label if the station belongs to a multi-station city, else None."""
    if not station_normalized:
        return None
    first = station_normalized.split(" ")[0]
    return METROPOLIS_MAP.get(first)


def trip_id(train_no: str, date: str, origine: str, destination: str) -> str:
    raw = f"{train_no}|{date}|{normalize_station(origine)}|{normalize_station(destination)}"
    return raw


def sncf_connect_url(origine_iata: str, destination_iata: str, date: str, heure_depart: str) -> str:
    """Build a deep link to SNCF Connect for the given trip."""
    # SNCF Connect search URL pattern (deep-link via search page)
    # Format: https://www.sncf-connect.com/app/home/search?origin=...&destination=...&date=...
    return (
        f"https://www.sncf-connect.com/app/home/search"
        f"?origin={origine_iata}&destination={destination_iata}"
        f"&inwardDate={date}T{heure_depart}:00"
    )


# ---------- Models ----------
class TripOut(BaseModel):
    id: str
    train_no: str
    date: str
    origine: str
    destination: str
    origine_iata: Optional[str] = None
    destination_iata: Optional[str] = None
    heure_depart: str
    heure_arrivee: str
    axe: Optional[str] = ""
    train_type: str  # TGV_INOUI | INTERCITES | INTERCITES_NUIT
    fare_eur: float = 0.0
    price_checked_at: Optional[str] = None
    sncf_connect_url: str
    destination_metropolis: Optional[str] = None
    departure_datetime: str  # ISO


class DestinationGroup(BaseModel):
    destination_city: str  # metropolis or normalized station
    destinations: List[str]  # actual station names within
    trip_count: int
    trips: List[TripOut]


class SearchResponse(BaseModel):
    origin: str
    total_trips: int
    groups: List[DestinationGroup]
    last_sync_at: Optional[str] = None
    served: bool = True


class SyncInfo(BaseModel):
    last_sync_at: Optional[str] = None
    last_sync_status: str = "pending"
    total_trips: int = 0
    last_error: Optional[str] = None
    next_sync_at: Optional[str] = None


class StationSuggestion(BaseModel):
    name: str  # display name (cleaned)
    raw: str  # original
    is_metropolis: bool = False


# ---------- Sync logic ----------
async def fetch_sncf_data() -> Optional[list[dict]]:
    """Fetch eligible TGV Max trips from SNCF Open Data."""
    today = datetime.now(timezone.utc).date()
    future = today + timedelta(days=30)
    where = f'od_happy_card="OUI" AND date>="{today.isoformat()}" AND date<="{future.isoformat()}"'
    params = {"where": where, "limit": -1}
    try:
        async with httpx.AsyncClient(timeout=120.0) as http:
            r = await http.get(SNCF_EXPORT_URL, params=params)
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        logger.error("SNCF fetch failed: %s", exc)
        return None


async def fetch_live_eligible_keys(trips: list[dict]) -> set[str]:
    """
    Revalide od_happy_card auprès de l'API SNCF (temps réel) pour les trajets affichés.
    Retourne l'ensemble des identifiants de trajets encore à 0 € (places MAX ouvertes).
    """
    if not trips:
        return set()

    by_date: dict[str, set[str]] = defaultdict(set)
    for t in trips:
        by_date[t["date"]].add(t["train_no"])

    eligible: set[str] = set()
    try:
        async with httpx.AsyncClient(timeout=45.0) as http:
            for date, train_nos in by_date.items():
                nos = list(train_nos)[:LIVE_FARE_CHECK_MAX_TRAINS]
                for i in range(0, len(nos), 40):
                    chunk = nos[i:i + 40]
                    in_clause = ",".join(f'"{n}"' for n in chunk)
                    where = f'train_no IN ({in_clause}) AND od_happy_card="OUI"'
                    params = {"where": where, "limit": 500}
                    r = await http.get(SNCF_RECORDS_URL, params=params)
                    r.raise_for_status()
                    for row in r.json().get("results", []):
                        if row.get("date") != date:
                            continue
                        if row.get("od_happy_card") != "OUI":
                            continue
                        eligible.add(
                            trip_id(
                                row.get("train_no", ""),
                                row.get("date", ""),
                                row.get("origine", ""),
                                row.get("destination", ""),
                            )
                        )
    except Exception as exc:
        logger.warning("Live fare check failed, using cached eligibility: %s", exc)
        return {trip_id(t["train_no"], t["date"], t["origine"], t["destination"]) for t in trips}

    return eligible


async def sync_trips() -> dict:
    """Run a sync cycle: fetch, dedupe, store, clean past."""
    started = datetime.now(timezone.utc)
    logger.info("Starting SNCF sync at %s", started.isoformat())
    data = await fetch_sncf_data()
    if data is None:
        await sync_col.update_one(
            {"_id": "main"},
            {"$set": {
                "last_sync_status": "error",
                "last_error": "SNCF API unavailable - using cached data",
                "last_attempt_at": started.isoformat(),
            }},
            upsert=True,
        )
        return {"status": "error", "reason": "sncf_unavailable"}

    today_iso = datetime.now(timezone.utc).date().isoformat()
    future_iso = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()

    # Build documents, dedupe in-memory
    seen = set()
    docs = []
    for row in data:
        if row.get("od_happy_card") != "OUI":
            continue
        date = row.get("date")
        train_no = row.get("train_no")
        origine = row.get("origine") or ""
        destination = row.get("destination") or ""
        if not (date and train_no and origine and destination):
            continue
        # RG3: skip beyond 30 days
        if date < today_iso or date > future_iso:
            continue
        tid = trip_id(train_no, date, origine, destination)
        if tid in seen:
            continue
        seen.add(tid)
        entity = row.get("entity") or ""
        heure_depart = row.get("heure_depart") or "00:00"
        heure_arrivee = row.get("heure_arrivee") or "00:00"
        axe = row.get("axe") or ""
        origine_iata = row.get("origine_iata") or ""
        destination_iata = row.get("destination_iata") or ""
        train_type = classify_train_type(entity, axe, origine, destination)
        if train_type is None:
            continue
        dep_dt = f"{date}T{heure_depart}:00"
        origine_norm = normalize_station(origine)
        destination_norm = normalize_station(destination)
        docs.append({
            "_id": tid,
            "train_no": train_no,
            "date": date,
            "entity": entity,
            "origine": origine,
            "destination": destination,
            "origine_norm": origine_norm,
            "destination_norm": destination_norm,
            "origine_iata": origine_iata,
            "destination_iata": destination_iata,
            "heure_depart": heure_depart,
            "heure_arrivee": heure_arrivee,
            "axe": axe,
            "train_type": train_type,
            "od_happy_card": row.get("od_happy_card") or "OUI",
            "fare_eur": 0.0,
            "origine_metropolis": metropolis_for(origine_norm),
            "destination_metropolis": metropolis_for(destination_norm),
            "departure_datetime": dep_dt,
            "synced_at": started.isoformat(),
        })

    # Replace strategy: drop all then bulk insert (dataset is small ~50K)
    await trips_col.delete_many({})
    if docs:
        # insert in chunks
        chunk = 5000
        for i in range(0, len(docs), chunk):
            await trips_col.insert_many(docs[i:i + chunk], ordered=False)

    # RG4: remove past departures (in case sync had any). Since we just rebuilt, the export already future-only by date.
    # But also remove same-day past times:
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    cur_time = now.strftime("%H:%M")
    await trips_col.delete_many({"date": today, "heure_depart": {"$lt": cur_time}})

    total = await trips_col.count_documents({})
    finished = datetime.now(timezone.utc)
    await sync_col.update_one(
        {"_id": "main"},
        {"$set": {
            "last_sync_at": finished.isoformat(),
            "last_sync_status": "ok",
            "total_trips": total,
            "last_error": None,
        }},
        upsert=True,
    )
    logger.info("Sync done. Total trips: %d (duration %.1fs)", total, (finished - started).total_seconds())
    return {"status": "ok", "total": total}


async def cleanup_past_trips():
    """RG4: remove trips whose departure has passed."""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    cur_time = now.strftime("%H:%M")
    res1 = await trips_col.delete_many({"date": {"$lt": today}})
    res2 = await trips_col.delete_many({"date": today, "heure_depart": {"$lt": cur_time}})
    if res1.deleted_count or res2.deleted_count:
        logger.info("Cleanup removed %d past trips", res1.deleted_count + res2.deleted_count)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"app": "MaxTracker", "status": "ok"}


@api_router.get("/sync/info", response_model=SyncInfo)
async def get_sync_info():
    doc = await sync_col.find_one({"_id": "main"}, {"_id": 0})
    if not doc:
        return SyncInfo()
    return SyncInfo(**doc)


@api_router.post("/sync/trigger")
async def trigger_sync():
    """Manual sync trigger (admin/dev)."""
    result = await sync_trips()
    return result


@api_router.get("/stations/search", response_model=List[StationSuggestion])
async def search_stations(q: str = "", limit: int = 15):
    """Autocomplete stations from departure side (origines)."""
    q = (q or "").strip()
    if len(q) < 3:
        return []
    qn = normalize_station(q)
    # Distinct origines matching prefix or contains
    pipeline = [
        {"$match": {"origine_norm": {"$regex": re.escape(qn)}}},
        {"$group": {"_id": "$origine"}},
        {"$limit": limit * 2},
    ]
    rows = await trips_col.aggregate(pipeline).to_list(limit * 2)
    suggestions: list[StationSuggestion] = []
    seen_metros = set()
    for r in rows:
        name = r["_id"]
        norm = normalize_station(name)
        metro = metropolis_for(norm)
        if metro:
            if metro not in seen_metros:
                seen_metros.add(metro)
                suggestions.append(StationSuggestion(name=metro + " (toutes gares)", raw=metro, is_metropolis=True))
        suggestions.append(StationSuggestion(name=name.title(), raw=name, is_metropolis=False))
        if len(suggestions) >= limit:
            break
    return suggestions[:limit]


@api_router.get("/search", response_model=SearchResponse)
async def search_trips(request: Request, origin: str = "", hide_metropolis: bool = False):
    """Find all eligible 0€ trips departing from `origin` (station name or metropolis label)."""
    # RG7: rate limit
    ip = request.client.host if request.client else "anon"
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Trop de recherches. Réessayez dans une minute.")

    # RG8: reject empty / invalid origin
    if not origin or not origin.strip():
        raise HTTPException(status_code=400, detail="Aucune gare de départ sélectionnée")

    origin_clean = origin.strip()
    origin_norm = normalize_station(origin_clean)
    # Determine match: metropolis match by origine_metropolis OR exact origine_norm
    is_metro = origin_clean in METROPOLIS_MAP.values() or origin_norm in METROPOLIS_MAP
    if is_metro:
        # find by metropolis label
        metro_label = METROPOLIS_MAP.get(origin_norm) or origin_clean
        query = {"origine_metropolis": metro_label}
    else:
        query = {"origine_norm": origin_norm}

    # Cleanup just-in-time
    await cleanup_past_trips()

    # Get last sync
    sync_doc = await sync_col.find_one({"_id": "main"}, {"_id": 0})
    last_sync = sync_doc.get("last_sync_at") if sync_doc else None

    cursor = trips_col.find(query, {"_id": 0, "origine_norm": 0, "destination_norm": 0, "synced_at": 0, "entity": 0, "od_happy_card": 0}).sort([("departure_datetime", 1)])
    raw = await cursor.to_list(5000)

    price_checked_at = datetime.now(timezone.utc).isoformat()
    if raw:
        live_keys = await fetch_live_eligible_keys(raw)
        raw = [
            t for t in raw
            if trip_id(t["train_no"], t["date"], t["origine"], t["destination"]) in live_keys
        ]

    if not raw:
        # Maybe origin not served
        any_check = await trips_col.find_one({"origine_norm": origin_norm}) if not is_metro else None
        served = any_check is not None if not is_metro else True
        # Also check metropolis any
        return SearchResponse(
            origin=origin_clean, total_trips=0, groups=[], last_sync_at=last_sync,
            served=served,
        )

    # Group by destination (metropolis or station)
    grouped: dict[str, dict] = {}
    for t in raw:
        dest_metro = t.get("destination_metropolis")
        dest = t.get("destination") or ""
        key = dest_metro if dest_metro else dest
        g = grouped.setdefault(key, {"destinations": set(), "trips": []})
        g["destinations"].add(dest)
        g["trips"].append(t)

    groups_out: list[DestinationGroup] = []
    for key, g in grouped.items():
        trips_out: list[TripOut] = []
        for t in g["trips"]:
            trips_out.append(TripOut(
                id=trip_id(t["train_no"], t["date"], t["origine"], t["destination"]),
                train_no=t["train_no"],
                date=t["date"],
                origine=t["origine"],
                destination=t["destination"],
                origine_iata=t.get("origine_iata"),
                destination_iata=t.get("destination_iata"),
                heure_depart=t["heure_depart"],
                heure_arrivee=t["heure_arrivee"],
                axe=t.get("axe") or "",
                train_type=t["train_type"],
                fare_eur=float(t.get("fare_eur", 0.0)),
                price_checked_at=price_checked_at,
                sncf_connect_url=sncf_connect_url(
                    t.get("origine_iata", ""), t.get("destination_iata", ""), t["date"], t["heure_depart"]
                ),
                destination_metropolis=t.get("destination_metropolis"),
                departure_datetime=t["departure_datetime"],
            ))
        trips_out.sort(key=lambda x: x.departure_datetime)
        groups_out.append(DestinationGroup(
            destination_city=key,
            destinations=sorted(g["destinations"]),
            trip_count=len(trips_out),
            trips=trips_out,
        ))
    groups_out.sort(key=lambda x: (-x.trip_count, x.destination_city))

    total = sum(g.trip_count for g in groups_out)
    return SearchResponse(
        origin=origin_clean, total_trips=total, groups=groups_out,
        last_sync_at=last_sync, served=True,
    )


# ---------- Scheduler / Startup ----------
scheduler: Optional[AsyncIOScheduler] = None


@app.on_event("startup")
async def on_startup():
    # Indexes
    await trips_col.create_index("origine_norm")
    await trips_col.create_index("destination_norm")
    await trips_col.create_index("origine_metropolis")
    await trips_col.create_index("destination_metropolis")
    await trips_col.create_index("date")
    await trips_col.create_index("departure_datetime")

    # Kick off background scheduler
    global scheduler
    scheduler = AsyncIOScheduler(timezone="Europe/Paris")
    scheduler.add_job(sync_trips, "interval", minutes=SYNC_INTERVAL_MIN, id="sync_job", max_instances=1)
    scheduler.add_job(cleanup_past_trips, "interval", minutes=5, id="cleanup_job", max_instances=1)
    scheduler.start()

    # Trigger an immediate sync (non-blocking) only if no data
    count = await trips_col.count_documents({})
    if count == 0:
        asyncio.create_task(sync_trips())


@app.on_event("shutdown")
async def on_shutdown():
    if scheduler:
        scheduler.shutdown(wait=False)
    client.close()


# ---------- Middleware & router ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
