"""Trajets « nouveaux » : apparus dans les dernières 24 h de publications SNCF.

Chaque trajet garde `first_seen` : l'horodatage de la publication SNCF où il
est apparu pour la dernière fois (après une absence éventuelle). La SNCF publie
une à plusieurs fois par jour ; on compare donc des horodatages de publication,
jamais l'heure de la synchronisation.

Pas de faux « nouveaux » :
- reconstruction de la même publication (sync forcée, déploiement) : un trajet
  absent de la base précédente n'est pas daté (`None`) ;
- première synchronisation (base vide) : idem.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Mapping, Optional

NEW_TRIP_WINDOW = timedelta(hours=24)


def _parse(timestamp: Optional[str]) -> Optional[datetime]:
    if not timestamp:
        return None
    try:
        return datetime.fromisoformat(timestamp)
    except ValueError:
        return None


def publication_changed(
    previous_publication: Optional[str],
    current_publication: Optional[str],
    *,
    previous_trip_count: int,
) -> bool:
    """Vrai si la base précédente reflète une autre publication SNCF connue."""
    return (
        previous_trip_count > 0
        and previous_publication is not None
        and current_publication is not None
        and previous_publication != current_publication
    )


def first_seen_for(
    trip_id: str,
    previous_first_seen: Mapping[str, Optional[str]],
    *,
    changed: bool,
    current_publication: Optional[str],
) -> Optional[str]:
    """Publication d'apparition du trajet (reportée s'il était déjà là)."""
    if trip_id in previous_first_seen:
        return previous_first_seen[trip_id]
    return current_publication if changed else None


def is_new_trip(first_seen: Optional[str], current_publication: Optional[str]) -> bool:
    seen, current = _parse(first_seen), _parse(current_publication)
    if seen is None or current is None:
        return False
    return timedelta(0) <= current - seen <= NEW_TRIP_WINDOW
