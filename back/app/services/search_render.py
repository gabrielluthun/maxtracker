"""Mise en forme des réponses /search à partir du payload en cache (fonctions pures).

Deux options, compatibles avec les anciens clients (valeurs par défaut =
réponse historique complète) :

- `connections=False` : sans parcours avec correspondance — ~6× plus léger,
  c'est ce qu'affiche le filtre « Direct » (par défaut côté front) ;
- `compact=True` : sans les champs que le front recalcule ou n'utilise pas
  (lien SNCF Connect, identifiants, horodatages redondants, tarif toujours 0).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Optional

from app.domain.station_labels import display_station_name
from app.domain.trips import filter_departed_from_payload

COMPACT_TRIP_DROP = (
    "id",
    "fare_eur",
    "price_checked_at",
    "departure_datetime",
    "destination_metropolis",
)
COMPACT_JOURNEY_DROP = ("id", "price_checked_at", "departure_datetime")

ConnectUrlBuilder = Callable[[dict[str, Any]], str]


def strip_connections(payload: dict[str, Any]) -> dict[str, Any]:
    """Retire les parcours avec correspondance et les groupes qui n'avaient qu'eux.

    `omitted_connected_trips` indique combien ont été retirés : le client peut
    proposer « voir avec correspondance » au lieu d'annoncer « aucun train ».
    """
    groups = payload.get("groups", [])
    out = dict(payload)
    out["omitted_connected_trips"] = sum(len(g.get("connected_trips", [])) for g in groups)
    out["groups"] = [
        {
            **g,
            "connected_trips": [],
            "trip_count": len(g["trips"]),
            # Gares atteintes en direct uniquement (sinon « 3 gares » pour 1 seule visible).
            "destinations": sorted({t.get("destination", "") for t in g["trips"]} - {""}),
        }
        for g in groups
        if g.get("trips")
    ]
    out["total_trips"] = sum(g["trip_count"] for g in out["groups"])
    return out


def sort_groups(payload: dict[str, Any]) -> dict[str, Any]:
    """Même ordre que le calcul initial : plus de trajets d'abord, puis ordre alphabétique."""
    out = dict(payload)
    out["groups"] = sorted(
        payload.get("groups", []),
        key=lambda g: (-g.get("trip_count", 0), g.get("destination_city", "")),
    )
    return out


def render_trip(
    trip: dict[str, Any], *, compact: bool, connect_url: ConnectUrlBuilder
) -> dict[str, Any]:
    out = dict(trip)
    out["origine_label"] = display_station_name(out.get("origine", ""), out.get("origine_iata"))
    out["destination_label"] = display_station_name(
        out.get("destination", ""), out.get("destination_iata")
    )
    if compact:
        for field in COMPACT_TRIP_DROP:
            out.pop(field, None)
        out.pop("sncf_connect_url", None)
    else:
        out["sncf_connect_url"] = connect_url(out)
    return out


def render_journey(
    journey: dict[str, Any], *, compact: bool, connect_url: ConnectUrlBuilder
) -> dict[str, Any]:
    out = dict(journey)
    out["legs"] = [
        render_trip(leg, compact=compact, connect_url=connect_url) for leg in journey.get("legs", [])
    ]
    if compact:
        for field in COMPACT_JOURNEY_DROP:
            out.pop(field, None)
    return out


def render_search_payload(
    payload: dict[str, Any],
    *,
    origin: str,
    connections: bool = True,
    compact: bool = False,
    connect_url: ConnectUrlBuilder,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    """Payload en cache (allégé) → réponse /search prête à sérialiser."""
    out: dict[str, Any] = {"served": True, **payload, "origin": origin}
    out = filter_departed_from_payload(out, now=now)
    if not connections:
        out = strip_connections(out)  # après le filtre : ne compte que les parcours à venir
    out = sort_groups(out)
    groups = []
    for group in out["groups"]:
        g = dict(group)
        g["trips"] = [
            render_trip(t, compact=compact, connect_url=connect_url) for t in g.get("trips", [])
        ]
        g["connected_trips"] = [
            render_journey(j, compact=compact, connect_url=connect_url)
            for j in g.get("connected_trips", [])
        ]
        groups.append(g)
    out["groups"] = groups
    return out
