"""Mise en forme des réponses /search : variantes connections / compact."""
from datetime import datetime

from app.domain.station_labels import clear_trigramme_cache
from app.domain.trips import PARIS_TZ
from app.services.search_render import (
    COMPACT_JOURNEY_DROP,
    COMPACT_TRIP_DROP,
    render_search_payload,
)

NOW = datetime(2026, 11, 12, 10, 0, tzinfo=PARIS_TZ)


def setup_function():
    clear_trigramme_cache()


def _trip(train_no, dest, heure, *, date="2026-11-12"):
    return {
        "id": f"{train_no}|{date}",
        "train_no": train_no,
        "date": date,
        "origine": "PARIS (intramuros)",
        "destination": dest,
        "origine_iata": "FRPLY",
        "destination_iata": "FRLPD",
        "heure_depart": heure,
        "heure_arrivee": "23:00",
        "axe": "SUD EST",
        "train_type": "TGV_INOUI",
        "fare_eur": 0.0,
        "price_checked_at": "2026-11-12T00:00:00+00:00",
        "destination_metropolis": "Lyon",
        "departure_datetime": f"{date}T{heure}:00",
    }


def _journey(dest, heure):
    leg1 = _trip("1", "DIJON VILLE", heure)
    leg2 = _trip("2", dest, "15:00")
    return {
        "id": "j1",
        "date": "2026-11-12",
        "heure_depart": heure,
        "heure_arrivee": "23:00",
        "departure_datetime": f"2026-11-12T{heure}:00",
        "hub_metropolis": "Dijon",
        "connection_count": 1,
        "connection_minutes": 60,
        "total_duration_minutes": 300,
        "destination_metropolis": "Lyon",
        "legs": [leg1, leg2],
        "price_checked_at": "2026-11-12T00:00:00+00:00",
    }


def _payload():
    return {
        "total_trips": 5,
        "last_sync_at": "sync-1",
        "groups": [
            {
                # Beaucoup de correspondances, un seul direct.
                "destination_city": "Lyon",
                "destinations": ["LYON PART DIEU", "LYON ST EXUPERY TGV"],
                "trip_count": 3,
                "trips": [_trip("6601", "LYON PART DIEU", "12:00")],
                "connected_trips": [
                    _journey("LYON ST EXUPERY TGV", "11:00"),
                    _journey("LYON ST EXUPERY TGV", "13:00"),
                ],
            },
            {
                "destination_city": "Marseille",
                "destinations": ["MARSEILLE ST CHARLES"],
                "trip_count": 2,
                "trips": [
                    _trip("6101", "MARSEILLE ST CHARLES", "11:00"),
                    _trip("6103", "MARSEILLE ST CHARLES", "14:00"),
                ],
                "connected_trips": [],
            },
            {
                # Atteinte uniquement avec correspondance.
                "destination_city": "Nice",
                "destinations": ["NICE VILLE"],
                "trip_count": 1,
                "trips": [],
                "connected_trips": [_journey("NICE VILLE", "12:30")],
            },
        ],
    }


def _url(trip):
    return f"https://connect.test/{trip['train_no']}"


def _render(**kwargs):
    return render_search_payload(_payload(), origin="Paris", connect_url=_url, now=NOW, **kwargs)


def test_default_render_is_full_historical_response():
    out = _render()
    assert out["origin"] == "Paris" and out["served"] is True
    assert [g["destination_city"] for g in out["groups"]] == ["Lyon", "Marseille", "Nice"]
    trip = out["groups"][0]["trips"][0]
    for field in COMPACT_TRIP_DROP:
        assert field in trip
    assert trip["sncf_connect_url"] == "https://connect.test/6601"
    assert trip["origine_label"] == "Paris"
    leg = out["groups"][0]["connected_trips"][0]["legs"][0]
    assert leg["sncf_connect_url"] == "https://connect.test/1"


def test_departed_trips_are_removed():
    late = datetime(2026, 11, 12, 12, 15, tzinfo=PARIS_TZ)
    out = render_search_payload(_payload(), origin="Paris", connect_url=_url, now=late)
    lyon = next(g for g in out["groups"] if g["destination_city"] == "Lyon")
    assert lyon["trips"] == []  # 12:00 est parti
    assert [j["heure_depart"] for j in lyon["connected_trips"]] == ["13:00"]
    assert out["total_trips"] == sum(g["trip_count"] for g in out["groups"])


def test_without_connections_keeps_direct_trips_only():
    out = _render(connections=False)
    cities = [g["destination_city"] for g in out["groups"]]
    # Nice (correspondance seule) disparaît ; Marseille (2 directs) passe devant Lyon (1).
    assert cities == ["Marseille", "Lyon"]
    assert all(g["connected_trips"] == [] for g in out["groups"])
    lyon = out["groups"][1]
    assert lyon["destinations"] == ["LYON PART DIEU"]
    assert lyon["trip_count"] == 1
    assert out["total_trips"] == 3


def test_compact_drops_recomputable_fields():
    out = _render(compact=True)
    trip = out["groups"][0]["trips"][0]
    for field in (*COMPACT_TRIP_DROP, "sncf_connect_url"):
        assert field not in trip
    # Ce dont le front a besoin pour afficher et construire le lien est conservé.
    for field in ("train_no", "date", "heure_depart", "heure_arrivee", "origine_iata",
                  "destination_iata", "origine", "destination", "origine_label", "train_type"):
        assert field in trip
    journey = out["groups"][0]["connected_trips"][0]
    for field in COMPACT_JOURNEY_DROP:
        assert field not in journey
    assert "sncf_connect_url" not in journey["legs"][0]
    assert journey["hub_metropolis"] == "Dijon"


def test_not_served_flag_is_preserved():
    out = render_search_payload(
        {"total_trips": 0, "groups": [], "served": False},
        origin="Xyz",
        connect_url=_url,
        now=NOW,
    )
    assert out["served"] is False and out["origin"] == "Xyz"


def test_render_does_not_mutate_cached_payload():
    payload = _payload()
    render_search_payload(payload, origin="Paris", connect_url=_url, now=NOW, compact=True,
                          connections=False)
    assert payload == _payload()
