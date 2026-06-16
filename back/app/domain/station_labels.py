"""Résolution des libellés de gare pour l'affichage (codes transporteur SNCF → nom lisible)."""
from __future__ import annotations

import logging
import re
import unicodedata
from functools import lru_cache
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger("maxtracker")

# Codes transporteur dont le suffixe ne correspond pas au trigramme gares-de-voyageurs.
TRANSPORTER_CODE_OVERRIDES: dict[str, str] = {
    "FRADJ": "Lille Flandres",
    "FRLLE": "Lille Europe",
    "FRLPD": "Lyon Part-Dieu",
    "FRLPE": "Lyon Perrache",
    "FRPBE": "Paris Bercy Bourgogne - Pays d'Auvergne",
    "FRPMO": "Paris Montparnasse",
    "FRPST": "Paris Gare de l'Est",
}

_INTRAMUROS_RE = re.compile(r"\(intramuros\)", re.IGNORECASE)


def _normalize_ascii_upper(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    only_ascii = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", only_ascii.upper()).strip()


def _is_intramuros(label: str) -> bool:
    return bool(_INTRAMUROS_RE.search(label or ""))


def _intramuros_city_title(label: str) -> str:
    city = (label or "").split("(")[0].strip()
    if not city:
        return label
    return city.title()


def _title_case_station(label: str) -> str:
    if not label:
        return ""
    return " ".join(word.capitalize() for word in label.split())


def _normalize_for_match(text: str) -> str:
    return re.sub(r"[\s\-]+", " ", _normalize_ascii_upper(text)).strip()


def _label_for_matching(raw_label: str) -> str:
    if _is_intramuros(raw_label):
        return (raw_label or "").split("(")[0].strip()
    return raw_label


def _gare_matches_station_label(gare_name: str, raw_label: str) -> bool:
    """Vérifie que le nom référentiel correspond au libellé SNCF (évite les faux trigrammes IATA)."""
    match_label = _label_for_matching(raw_label)
    norm_gare = _normalize_for_match(gare_name)
    norm_label = _normalize_for_match(match_label)
    if not norm_label:
        return False
    if norm_label in norm_gare or norm_gare in norm_label:
        return True
    tokens = [t for t in norm_label.split() if t not in ("LE", "LA", "LES", "L")]
    if not tokens:
        tokens = norm_label.split()
    first = tokens[0]
    if len(first) >= 4 and first in norm_gare:
        return True
    if len(tokens) >= 2:
        pair = f"{tokens[0]} {tokens[1]}"
        if len(pair) >= 5 and pair in norm_gare:
            return True
    return False


@lru_cache(maxsize=1)
def _load_trigramme_map() -> dict[str, str]:
    settings = get_settings()
    url = settings.sncf_gares_export_url
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.get(url, params={"limit": -1})
            response.raise_for_status()
            rows = response.json()
    except Exception as exc:
        logger.warning("SNCF gares referential fetch failed: %s", exc)
        return {}

    mapping: dict[str, str] = {}
    for row in rows:
        tri = (row.get("libellecourt") or "").strip().upper()
        name = (row.get("nom") or "").strip()
        if tri and name:
            mapping[tri] = name
    return mapping


def clear_trigramme_cache() -> None:
    """Réinitialise le cache (tests)."""
    _load_trigramme_map.cache_clear()


def display_station_name(label: str, transporter_code: Optional[str] = None) -> str:
    """Retourne un libellé lisible pour l'affichage dans les résultats."""
    raw_label = (label or "").strip()
    code = (transporter_code or "").strip().upper()

    if code in TRANSPORTER_CODE_OVERRIDES:
        return TRANSPORTER_CODE_OVERRIDES[code]

    if code and len(code) >= 5:
        trigramme = code[2:]
        gare_name = _load_trigramme_map().get(trigramme)
        if gare_name and _gare_matches_station_label(gare_name, raw_label):
            return gare_name

    if _is_intramuros(raw_label):
        return _intramuros_city_title(raw_label)

    return _title_case_station(raw_label)
