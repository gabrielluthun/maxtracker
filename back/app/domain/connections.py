"""
Composition de parcours avec correspondance (2 segments).

Chaque ligne open data = un segment. Toute correspondance valide joint :
  segment 1 : métropole A → métropole hub H
  segment 2 : métropole H → métropole B
avec H dans HUB_METROPOLISES (Paris, Lyon, Lille, …) et une fenêtre horaire réaliste.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import DefaultDict, Iterable, Optional, Sequence

from app.domain.stations import (
    HUB_METROPOLISES,
    is_hub_metropolis,
    normalize_station,
    trip_id,
)

MIN_CONNECT_SAME_STATION = 25
MIN_CONNECT_SAME_METROPOLIS = 50
MAX_CONNECT_MINUTES = 6 * 60

HubDateKey = tuple[str, str]  # (date ISO, hub metropolis label)


@dataclass(frozen=True)
class TripSegment:
    train_no: str
    date: str
    origine: str
    destination: str
    heure_depart: str
    heure_arrivee: str
    origine_metropolis: Optional[str] = None
    destination_metropolis: Optional[str] = None
    train_type: str = ""
    segment_id: str = ""


@dataclass(frozen=True)
class ConnectedJourney:
    hub_metropolis: str
    legs: tuple[TripSegment, TripSegment]
    connection_minutes: int
    total_duration_minutes: int

    @property
    def date(self) -> str:
        return self.legs[0].date

    @property
    def heure_depart(self) -> str:
        return self.legs[0].heure_depart

    @property
    def heure_arrivee(self) -> str:
        return self.legs[1].heure_arrivee

    @property
    def destination_metropolis(self) -> Optional[str]:
        return self.legs[1].destination_metropolis

    @property
    def journey_id(self) -> str:
        return f"{self.legs[0].segment_id}>>{self.legs[1].segment_id}"


def time_to_minutes(hhmm: str) -> int:
    s = (hhmm or "00:00").strip()[:5]
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def minutes_between_arrival_and_departure(heure_arrivee: str, heure_depart: str) -> int:
    arr = time_to_minutes(heure_arrivee)
    dep = time_to_minutes(heure_depart)
    if dep >= arr:
        return dep - arr
    return (24 * 60 - arr) + dep


def required_connection_minutes(
    leg1_destination: str,
    leg2_origine: str,
    *,
    leg1_destination_metropolis: Optional[str] = None,
    leg2_origine_metropolis: Optional[str] = None,
) -> Optional[int]:
    d_norm = normalize_station(leg1_destination)
    o_norm = normalize_station(leg2_origine)
    if d_norm == o_norm:
        return MIN_CONNECT_SAME_STATION
    m1 = leg1_destination_metropolis
    m2 = leg2_origine_metropolis
    if m1 and m2 and m1 == m2:
        return MIN_CONNECT_SAME_METROPOLIS
    return None


def connectable_hub(leg1: TripSegment, leg2: TripSegment) -> Optional[str]:
    """
    Hub de correspondance si les deux segments s'enchaînent dans la même métropole H.
    """
    if leg1.date != leg2.date:
        return None
    hub = leg1.destination_metropolis
    if not hub or hub != leg2.origine_metropolis:
        return None
    if not is_hub_metropolis(hub):
        return None
    return hub


def is_viable_first_leg(leg: TripSegment, *, origin_metropolis: Optional[str]) -> bool:
    """Segment « vers un hub » : arrive dans une métropole différente du départ."""
    hub = leg.destination_metropolis
    if not is_hub_metropolis(hub):
        return False
    if origin_metropolis and hub == origin_metropolis:
        return False
    return True


def is_viable_second_leg(leg: TripSegment) -> bool:
    """Segment « depuis un hub »."""
    return is_hub_metropolis(leg.origine_metropolis)


def is_meaningful_journey(leg1: TripSegment, leg2: TripSegment) -> bool:
    """Exclut les allers-retours immédiats (ex. Lille → Paris → Lille)."""
    dest = leg2.destination_metropolis
    orig = leg1.origine_metropolis
    if dest and orig and dest == orig:
        return False
    if leg1.segment_id and leg1.segment_id == leg2.segment_id:
        return False
    return True


def connection_wait_is_valid(
    leg1: TripSegment,
    leg2: TripSegment,
    *,
    max_connect_minutes: int = MAX_CONNECT_MINUTES,
) -> bool:
    min_wait = required_connection_minutes(
        leg1.destination,
        leg2.origine,
        leg1_destination_metropolis=leg1.destination_metropolis,
        leg2_origine_metropolis=leg2.origine_metropolis,
    )
    if min_wait is None:
        return False
    wait = minutes_between_arrival_and_departure(leg1.heure_arrivee, leg2.heure_depart)
    return min_wait <= wait <= max_connect_minutes


def segments_connect(
    leg1: TripSegment,
    leg2: TripSegment,
    *,
    max_connect_minutes: int = MAX_CONNECT_MINUTES,
) -> bool:
    if connectable_hub(leg1, leg2) is None:
        return False
    if not is_meaningful_journey(leg1, leg2):
        return False
    return connection_wait_is_valid(leg1, leg2, max_connect_minutes=max_connect_minutes)


def build_departures_from_hub_index(
    segments: Iterable[TripSegment],
) -> dict[HubDateKey, list[TripSegment]]:
    """Index (date, hub) → segments qui partent de ce hub."""
    index: DefaultDict[HubDateKey, list[TripSegment]] = defaultdict(list)
    for leg in segments:
        hub = leg.origine_metropolis
        if not is_hub_metropolis(hub):
            continue
        index[(leg.date, hub)].append(leg)
    return dict(index)


def find_all_connected_journeys(
    first_legs: Sequence[TripSegment],
    second_legs: Sequence[TripSegment],
    *,
    origin_metropolis: Optional[str] = None,
    destination_metropolis: Optional[str] = None,
    max_connect_minutes: int = MAX_CONNECT_MINUTES,
) -> list[ConnectedJourney]:
    """
    Toutes les correspondances à 2 segments entre first_legs et second_legs.

    - first_legs : en pratique les segments partant de la gare / métropole recherchée
    - second_legs : pool plus large (ex. tous les départs depuis les hubs ce jour-là)
    - destination_metropolis : si renseigné, ne garde que les parcours vers cette ville
    """
    index = build_departures_from_hub_index(second_legs)
    out: list[ConnectedJourney] = []
    seen: set[str] = set()

    for leg1 in first_legs:
        if not is_viable_first_leg(leg1, origin_metropolis=origin_metropolis):
            continue
        hub = leg1.destination_metropolis
        assert hub is not None
        candidates = index.get((leg1.date, hub), ())
        for leg2 in candidates:
            if not is_viable_second_leg(leg2):
                continue
            if destination_metropolis and leg2.destination_metropolis != destination_metropolis:
                continue
            if not segments_connect(leg1, leg2, max_connect_minutes=max_connect_minutes):
                continue
            wait = minutes_between_arrival_and_departure(leg1.heure_arrivee, leg2.heure_depart)
            total = minutes_between_arrival_and_departure(leg1.heure_depart, leg2.heure_arrivee)
            journey = ConnectedJourney(
                hub_metropolis=hub,
                legs=(leg1, leg2),
                connection_minutes=wait,
                total_duration_minutes=total,
            )
            if journey.journey_id in seen:
                continue
            seen.add(journey.journey_id)
            out.append(journey)

    out.sort(key=lambda j: (j.date, j.heure_depart, j.connection_minutes))
    return out


def hubs_reachable_as_first_leg(
    segments: Sequence[TripSegment],
    *,
    origin_metropolis: Optional[str],
) -> frozenset[str]:
    """Métropoles-hub atteignables en un segment depuis l'origine."""
    return frozenset(
        leg.destination_metropolis
        for leg in segments
        if is_viable_first_leg(leg, origin_metropolis=origin_metropolis)
        and leg.destination_metropolis
    )


def segment_from_trip_doc(doc: dict) -> TripSegment:
    return TripSegment(
        train_no=doc.get("train_no", ""),
        date=doc.get("date", ""),
        origine=doc.get("origine", ""),
        destination=doc.get("destination", ""),
        heure_depart=doc.get("heure_depart", ""),
        heure_arrivee=doc.get("heure_arrivee", ""),
        origine_metropolis=doc.get("origine_metropolis"),
        destination_metropolis=doc.get("destination_metropolis"),
        train_type=doc.get("train_type", ""),
        segment_id=trip_id(
            doc.get("train_no", ""),
            doc.get("date", ""),
            doc.get("origine", ""),
            doc.get("destination", ""),
        ),
    )


def segments_to_connected_journeys(
    outbound_from_origin: Sequence[TripSegment],
    segments_departing_hubs: Sequence[TripSegment],
    *,
    origin_metropolis: Optional[str] = None,
    destination_metropolis: Optional[str] = None,
) -> list[ConnectedJourney]:
    """
    Point d'entrée pour la recherche : compose toutes les correspondances possibles
    vers destination_metropolis (ex. Marseille), pour tous les hubs.
    """
    return find_all_connected_journeys(
        outbound_from_origin,
        segments_departing_hubs,
        origin_metropolis=origin_metropolis,
        destination_metropolis=destination_metropolis,
    )
    