"""
Composition de parcours avec correspondance (2 à 3 segments, max 2 correspondances).

Chaque ligne open data = un segment. Les hubs sont les métropoles du référentiel
(Paris, Lyon, Lille, …) avec fenêtres de correspondance 25 / 50 min.
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
MAX_CONNECTIONS = 2  # 3 segments max

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
    origine_iata: Optional[str] = None
    destination_iata: Optional[str] = None
    axe: str = ""
    departure_datetime: str = ""


@dataclass(frozen=True)
class ConnectedJourney:
    legs: tuple[TripSegment, ...]
    connection_minutes: int
    total_duration_minutes: int

    @property
    def connection_count(self) -> int:
        return len(self.legs) - 1

    @property
    def date(self) -> str:
        return self.legs[0].date

    @property
    def heure_depart(self) -> str:
        return self.legs[0].heure_depart

    @property
    def heure_arrivee(self) -> str:
        return self.legs[-1].heure_arrivee

    @property
    def destination_metropolis(self) -> Optional[str]:
        return self.legs[-1].destination_metropolis

    @property
    def hub_metropolises(self) -> tuple[str, ...]:
        hubs: list[str] = []
        for i in range(len(self.legs) - 1):
            hub = connectable_hub(self.legs[i], self.legs[i + 1])
            if hub:
                hubs.append(hub)
        return tuple(hubs)

    @property
    def hub_metropolis(self) -> str:
        return " · ".join(self.hub_metropolises)

    @property
    def journey_id(self) -> str:
        return self.fingerprint

    @property
    def fingerprint(self) -> str:
        """Empreinte affichable (trains + horaires + gares), indépendante des segment_id open data."""
        return journey_fingerprint(self)


def _leg_origin_key(leg: TripSegment) -> str:
    """Même métropole de départ → une seule clé (ex. LILLE EUROPE vs LILLE intramuros)."""
    if leg.origine_metropolis:
        return f"metro:{leg.origine_metropolis}"
    return normalize_station(leg.origine)


def leg_fingerprint(leg: TripSegment) -> str:
    dep = (leg.heure_depart or "")[:5]
    arr = (leg.heure_arrivee or "")[:5]
    return (
        f"{leg.date}|{dep}|{arr}|{leg.train_no}|"
        f"{_leg_origin_key(leg)}|{normalize_station(leg.destination)}"
    )


def journey_fingerprint(journey: ConnectedJourney) -> str:
    return ">>".join(leg_fingerprint(leg) for leg in journey.legs)


def direct_trip_fingerprint(doc: dict) -> str:
    """Empreinte d'un trajet direct (déduplication open data)."""
    dep = (doc.get("heure_depart") or "")[:5]
    arr = (doc.get("heure_arrivee") or "")[:5]
    orig_metro = doc.get("origine_metropolis")
    orig = f"metro:{orig_metro}" if orig_metro else normalize_station(doc.get("origine", ""))
    return (
        f"{doc.get('date', '')}|{dep}|{arr}|{doc.get('train_no', '')}|"
        f"{orig}|{normalize_station(doc.get('destination', ''))}"
    )


def dedupe_connected_journeys(
    journeys: Sequence[ConnectedJourney],
) -> list[ConnectedJourney]:
    seen: set[str] = set()
    out: list[ConnectedJourney] = []
    for j in journeys:
        fp = j.fingerprint
        if fp in seen:
            continue
        seen.add(fp)
        out.append(j)
    return out


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
    if leg1.date != leg2.date:
        return None
    hub = leg1.destination_metropolis
    if not hub or hub != leg2.origine_metropolis:
        return None
    if not is_hub_metropolis(hub):
        return None
    return hub


def is_viable_first_leg(leg: TripSegment, *, origin_metropolis: Optional[str]) -> bool:
    hub = leg.destination_metropolis
    if not is_hub_metropolis(hub):
        return False
    if origin_metropolis and hub == origin_metropolis:
        return False
    return True


def is_viable_hub_departure_leg(leg: TripSegment) -> bool:
    return is_hub_metropolis(leg.origine_metropolis)


def is_meaningful_journey(leg_first: TripSegment, leg_last: TripSegment) -> bool:
    dest = leg_last.destination_metropolis
    orig = leg_first.origine_metropolis
    if dest and orig and dest == orig:
        return False
    if leg_first.segment_id and leg_first.segment_id == leg_last.segment_id:
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
    index: DefaultDict[HubDateKey, list[TripSegment]] = defaultdict(list)
    for leg in segments:
        hub = leg.origine_metropolis
        if not is_hub_metropolis(hub):
            continue
        index[(leg.date, hub)].append(leg)
    return dict(index)


def _journey_from_legs(legs: tuple[TripSegment, ...]) -> ConnectedJourney:
    wait = sum(
        minutes_between_arrival_and_departure(legs[i].heure_arrivee, legs[i + 1].heure_depart)
        for i in range(len(legs) - 1)
    )
    total = minutes_between_arrival_and_departure(legs[0].heure_depart, legs[-1].heure_arrivee)
    return ConnectedJourney(
        legs=legs,
        connection_minutes=wait,
        total_duration_minutes=total,
    )


def _find_two_leg_journeys(
    first_legs: Sequence[TripSegment],
    index: dict[HubDateKey, list[TripSegment]],
    *,
    origin_metropolis: Optional[str],
    max_connect_minutes: int,
) -> list[ConnectedJourney]:
    out: list[ConnectedJourney] = []
    seen: set[str] = set()

    for leg1 in first_legs:
        if not is_viable_first_leg(leg1, origin_metropolis=origin_metropolis):
            continue
        hub = leg1.destination_metropolis
        assert hub is not None
        for leg2 in index.get((leg1.date, hub), ()):
            if not is_viable_hub_departure_leg(leg2):
                continue
            if not segments_connect(leg1, leg2, max_connect_minutes=max_connect_minutes):
                continue
            if not is_meaningful_journey(leg1, leg2):
                continue
            journey = _journey_from_legs((leg1, leg2))
            fp = journey.fingerprint
            if fp in seen:
                continue
            seen.add(fp)
            out.append(journey)
    return out


def _extend_to_three_legs(
    two_leg: Sequence[ConnectedJourney],
    index: dict[HubDateKey, list[TripSegment]],
    *,
    max_connect_minutes: int,
    seen: set[str],
) -> list[ConnectedJourney]:
    out: list[ConnectedJourney] = []
    for journey in two_leg:
        leg2 = journey.legs[-1]
        hub = leg2.destination_metropolis
        if not hub:
            continue
        for leg3 in index.get((leg2.date, hub), ()):
            if not is_viable_hub_departure_leg(leg3):
                continue
            if not segments_connect(leg2, leg3, max_connect_minutes=max_connect_minutes):
                continue
            if not is_meaningful_journey(journey.legs[0], leg3):
                continue
            if leg3.segment_id in {leg.segment_id for leg in journey.legs}:
                continue
            legs3 = (*journey.legs, leg3)
            j3 = _journey_from_legs(legs3)
            fp = j3.fingerprint
            if fp in seen:
                continue
            seen.add(fp)
            out.append(j3)
    return out


def find_all_connected_journeys(
    first_legs: Sequence[TripSegment],
    hub_departure_legs: Sequence[TripSegment],
    *,
    origin_metropolis: Optional[str] = None,
    destination_metropolis: Optional[str] = None,
    max_connections: int = MAX_CONNECTIONS,
    max_connect_minutes: int = MAX_CONNECT_MINUTES,
) -> list[ConnectedJourney]:
    max_connections = min(max(max_connections, 0), MAX_CONNECTIONS)
    if max_connections == 0:
        return []

    index = build_departures_from_hub_index(hub_departure_legs)
    seen: set[str] = set()
    out: list[ConnectedJourney] = []

    two_leg = _find_two_leg_journeys(
        first_legs,
        index,
        origin_metropolis=origin_metropolis,
        max_connect_minutes=max_connect_minutes,
    )
    for j in two_leg:
        fp = j.fingerprint
        if fp in seen:
            continue
        seen.add(fp)
        if j.connection_count <= max_connections:
            out.append(j)

    if max_connections >= 2:
        three_leg = _extend_to_three_legs(
            two_leg,
            index,
            max_connect_minutes=max_connect_minutes,
            seen=seen,
        )
        for j in three_leg:
            if j.connection_count <= max_connections:
                out.append(j)

    if destination_metropolis:
        out = [j for j in out if j.destination_metropolis == destination_metropolis]

    out.sort(key=lambda j: (j.date, j.heure_depart, j.connection_count, j.connection_minutes))
    return dedupe_connected_journeys(out)


def hubs_reachable_as_first_leg(
    segments: Sequence[TripSegment],
    *,
    origin_metropolis: Optional[str],
) -> frozenset[str]:
    return frozenset(
        leg.destination_metropolis
        for leg in segments
        if is_viable_first_leg(leg, origin_metropolis=origin_metropolis)
        and leg.destination_metropolis
    )


def hub_date_keys_from_outbound(
    outbound_docs: Sequence[dict],
    *,
    origin_metropolis: Optional[str],
) -> frozenset[HubDateKey]:
    """Paires (date, hub) pour la 1re requête Mongo."""
    segments = [segment_from_trip_doc(d) for d in outbound_docs]
    keys: set[HubDateKey] = set()
    for leg in segments:
        if not is_viable_first_leg(leg, origin_metropolis=origin_metropolis):
            continue
        if leg.date and leg.destination_metropolis:
            keys.add((leg.date, leg.destination_metropolis))
    return frozenset(keys)


def hub_date_keys_from_two_leg_journeys(
    journeys: Sequence[ConnectedJourney],
) -> frozenset[HubDateKey]:
    """Paires (date, hub) pour charger les départs du 2e hub (3e segment)."""
    keys: set[HubDateKey] = set()
    for j in journeys:
        if j.connection_count < 1:
            continue
        last = j.legs[-1]
        if last.date and last.destination_metropolis and is_hub_metropolis(last.destination_metropolis):
            keys.add((last.date, last.destination_metropolis))
    return frozenset(keys)


def connection_search_keys(
    outbound_docs: Sequence[dict],
    *,
    origin_metropolis: Optional[str],
) -> tuple[frozenset[str], frozenset[str]]:
    """Compat tests : hubs + dates dérivés des clés (date, hub)."""
    keys = hub_date_keys_from_outbound(outbound_docs, origin_metropolis=origin_metropolis)
    hubs = frozenset(h for _, h in keys)
    dates = frozenset(d for d, _ in keys)
    return hubs, dates


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
        origine_iata=doc.get("origine_iata"),
        destination_iata=doc.get("destination_iata"),
        axe=doc.get("axe") or "",
        departure_datetime=doc.get("departure_datetime", ""),
    )


def segments_to_connected_journeys(
    outbound_from_origin: Sequence[TripSegment],
    segments_departing_hubs: Sequence[TripSegment],
    *,
    origin_metropolis: Optional[str] = None,
    destination_metropolis: Optional[str] = None,
    max_connections: int = MAX_CONNECTIONS,
) -> list[ConnectedJourney]:
    return find_all_connected_journeys(
        outbound_from_origin,
        segments_departing_hubs,
        origin_metropolis=origin_metropolis,
        destination_metropolis=destination_metropolis,
        max_connections=max_connections,
    )


def compose_connected_journeys(
    outbound_docs: Sequence[dict],
    hub_departure_docs: Sequence[dict],
    *,
    origin_metropolis: Optional[str] = None,
    max_connections: int = MAX_CONNECTIONS,
) -> list[ConnectedJourney]:
    return segments_to_connected_journeys(
        [segment_from_trip_doc(d) for d in outbound_docs],
        [segment_from_trip_doc(d) for d in hub_departure_docs],
        origin_metropolis=origin_metropolis,
        max_connections=max_connections,
    )


def merge_hub_departure_docs(*doc_lists: Sequence[dict]) -> list[dict]:
    """Fusionne des listes de segments hub sans doublon _id."""
    seen: set[str] = set()
    out: list[dict] = []
    for docs in doc_lists:
        for d in docs:
            sid = trip_id(
                d.get("train_no", ""),
                d.get("date", ""),
                d.get("origine", ""),
                d.get("destination", ""),
            )
            if sid in seen:
                continue
            seen.add(sid)
            out.append(d)
    return out
