"""SNCF Connect deep link generation."""
from datetime import datetime
from urllib.parse import urlencode

from app.config import Settings


def _format_french_search_date(iso_date: str) -> str:
    try:
        dt = datetime.strptime(iso_date, "%Y-%m-%d")
        months = (
            "janvier", "février", "mars", "avril", "mai", "juin",
            "juillet", "août", "septembre", "octobre", "novembre", "décembre",
        )
        return f"{dt.day} {months[dt.month - 1]} {dt.year}"
    except ValueError:
        return iso_date


def _format_outward_date(date: str, heure_depart: str) -> str:
    """Format attendu par SNCF Connect /redirect : YYYY-MM-DD-HH-MM."""
    time_part = (heure_depart or "00:00").strip()[:5]
    hours, minutes = (time_part.split(":") + ["00"])[:2]
    return f"{date}-{int(hours):02d}-{int(minutes):02d}"


def _format_french_search_time(heure_depart: str) -> str:
    time_part = (heure_depart or "00:00").strip()[:5]
    hours, minutes = (time_part.split(":") + ["00"])[:2]
    return f"{hours}h{minutes}"


def build_sncf_connect_url(
    settings: Settings,
    origine_iata: str,
    destination_iata: str,
    date: str,
    heure_depart: str,
    origine: str = "",
    destination: str = "",
) -> str:
    base = settings.sncf_connect_base
    origin_code = (origine_iata or "").strip()
    dest_code = (destination_iata or "").strip()
    time_part = (heure_depart or "00:00").strip()[:5]

    if origin_code and dest_code:
        params = {
            "nb_pax": "1",
            "origin_transporter_code": origin_code,
            "destination_transporter_code": dest_code,
            "redirection_type": "SEARCH",
            "branch": "SHOP",
        }
        if date:
            params["outward_date"] = _format_outward_date(date, time_part)
        return f"{base}/redirect?{urlencode(params)}"

    parts = [origine.strip(), destination.strip()]
    if date:
        parts.append(f"le {_format_french_search_date(date)}")
    if time_part:
        parts.append(f"à {_format_french_search_time(heure_depart)}")
    return f"{base}/app/home/search?{urlencode({'q': ' '.join(p for p in parts if p)})}"
