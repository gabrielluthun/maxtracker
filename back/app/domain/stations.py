"""Station normalization and metropolis grouping."""
import re
import unicodedata
from typing import Optional

METROPOLIS_MAP: dict[str, str] = {
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


def normalize_station(name: str) -> str:
    """Normalize station name (uppercase, no accents, trimmed)."""
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    only_ascii = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", only_ascii.upper()).strip()


def metropolis_for(station_normalized: str) -> Optional[str]:
    """Return metropolis label if the station belongs to a multi-station city."""
    if not station_normalized:
        return None
    first = station_normalized.split(" ")[0]
    return METROPOLIS_MAP.get(first)


def trip_id(train_no: str, date: str, origine: str, destination: str) -> str:
    return (
        f"{train_no}|{date}|{normalize_station(origine)}|{normalize_station(destination)}"
    )


def is_metropolis_query(origin_clean: str, origin_norm: str) -> bool:
    return origin_clean in METROPOLIS_MAP.values() or origin_norm in METROPOLIS_MAP


def metropolis_label(origin_clean: str, origin_norm: str) -> str:
    return METROPOLIS_MAP.get(origin_norm) or origin_clean
