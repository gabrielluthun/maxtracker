"""Trip time helpers (Europe/Paris)."""
from datetime import datetime
from zoneinfo import ZoneInfo

PARIS_TZ = ZoneInfo("Europe/Paris")


def paris_cleanup_cutoff(now: datetime | None = None) -> tuple[str, str]:
    dt = datetime.now(PARIS_TZ) if now is None else now.astimezone(PARIS_TZ)
    return dt.date().isoformat(), dt.strftime("%H:%M")


def departure_passed(date: str, heure_depart: str, *, now: datetime | None = None) -> bool:
    today, cur_time = paris_cleanup_cutoff(now)
    dep_time = (heure_depart or "00:00").strip()[:5]
    if date < today:
        return True
    if date > today:
        return False
    return dep_time < cur_time
