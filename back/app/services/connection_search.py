"""Composition des parcours avec correspondance pour la recherche."""
from __future__ import annotations

from typing import Optional

from app.domain.connections import ConnectedJourney, TripSegment
from app.schemas.trips import ConnectedTripOut, TripOut
from app.services.sncf.connect import build_sncf_connect_url


def _settings_like(sncf_connect_base: str):
    from types import SimpleNamespace

    return SimpleNamespace(sncf_connect_base=sncf_connect_base)


def trip_out_from_segment(
    seg: TripSegment,
    *,
    sncf_connect_base: str,
    price_checked_at: str,
) -> TripOut:
    return TripOut(
        id=seg.segment_id,
        train_no=seg.train_no,
        date=seg.date,
        origine=seg.origine,
        destination=seg.destination,
        origine_iata=seg.origine_iata,
        destination_iata=seg.destination_iata,
        heure_depart=seg.heure_depart,
        heure_arrivee=seg.heure_arrivee,
        axe=seg.axe,
        train_type=seg.train_type,
        fare_eur=0.0,
        price_checked_at=price_checked_at,
        sncf_connect_url=build_sncf_connect_url(
            _settings_like(sncf_connect_base),
            seg.origine_iata or "",
            seg.destination_iata or "",
            seg.date,
            seg.heure_depart,
            seg.origine,
            seg.destination,
        ),
        destination_metropolis=seg.destination_metropolis,
        departure_datetime=seg.departure_datetime
        or f"{seg.date}T{seg.heure_depart[:5]}:00",
    )


def connected_trip_out_from_journey(
    journey: ConnectedJourney,
    *,
    sncf_connect_base: str,
    price_checked_at: str,
) -> ConnectedTripOut:
    legs = [
        trip_out_from_segment(
            seg, sncf_connect_base=sncf_connect_base, price_checked_at=price_checked_at
        )
        for seg in journey.legs
    ]
    first = journey.legs[0]
    last = journey.legs[1]
    dep_dt = first.departure_datetime or f"{first.date}T{first.heure_depart[:5]}:00"
    return ConnectedTripOut(
        id=journey.journey_id,
        date=journey.date,
        heure_depart=journey.heure_depart,
        heure_arrivee=journey.heure_arrivee,
        departure_datetime=dep_dt,
        hub_metropolis=journey.hub_metropolis,
        connection_minutes=journey.connection_minutes,
        total_duration_minutes=journey.total_duration_minutes,
        destination_metropolis=journey.destination_metropolis,
        legs=legs,
        price_checked_at=price_checked_at,
    )


def destination_key_for_journey(journey: ConnectedJourney) -> str:
    """Clé de regroupement (métropole ou gare finale)."""
    if journey.destination_metropolis:
        return journey.destination_metropolis
    return journey.legs[1].destination


def merge_connected_into_groups(
    grouped: dict[str, dict],
    journeys: list[ConnectedJourney],
    *,
    sncf_connect_base: str,
    price_checked_at: str,
) -> None:
    """Ajoute les parcours composés aux groupes destination (mutation de grouped)."""
    for journey in journeys:
        key = destination_key_for_journey(journey)
        g = grouped.setdefault(
            key,
            {"destinations": set(), "trips": [], "connected_trips": []},
        )
        final_dest = journey.legs[1].destination
        if final_dest:
            g["destinations"].add(final_dest)
        g["connected_trips"].append(
            connected_trip_out_from_journey(
                journey,
                sncf_connect_base=sncf_connect_base,
                price_checked_at=price_checked_at,
            )
        )
