"""Recherche de gares : noms usuels → gares du flux SNCF."""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.domain.station_search import build_station_index, find_stations, search_forms
from app.services.search import SearchService
from app.core.rate_limit import RateLimiter

# Couples (origine, code) et noms affichés tels qu'observés dans le flux (novembre 2026).
LABELS = {
    "FRPAZ": "Paris Austerlitz",
    "FRPLY": "Paris Gare de Lyon",
    "FRPMO": "Paris Montparnasse",
    "FRPNO": "Paris Gare du Nord",
    "FRPST": "Paris Gare de l'Est",
    "FRLPD": "Lyon Part-Dieu",
    "FRLPE": "Lyon Perrache",
    "FRLLE": "Lille Europe",
    "FRADJ": "Lille Flandres",
    "FRXSP": "Saint-Pierre-des-Corps",
    "FRMPL": "Montpellier Saint-Roch",
}
ROWS = [
    {"origine": "PARIS (intramuros)", "iata": code} for code in ("FRPAZ", "FRPLY", "FRPMO", "FRPNO", "FRPST")
] + [
    {"origine": "LYON (intramuros)", "iata": "FRLPD"},
    {"origine": "LYON (intramuros)", "iata": "FRLPE"},
    {"origine": "LYON ST EXUPERY TGV.", "iata": "FRXYD"},
    {"origine": "LILLE (intramuros)", "iata": "FRLLE"},
    {"origine": "LILLE (intramuros)", "iata": "FRADJ"},
    {"origine": "ST PIERRE DES CORPS", "iata": "FRXSP"},
    {"origine": "MONTPELLIER SAINT ROCH", "iata": "FRMPL"},
    {"origine": "SAINT ETIENNE CHATEAUCREUX", "iata": None},
    {"origine": "ST MALO", "iata": None},
    {"origine": "MARNE LA VALLEE CHESSY", "iata": None},
    {"origine": "AEROPORT ROISSY CDG 2 TGV", "iata": None},
    {"origine": "CLERMONT FERRAND", "iata": None},
    {"origine": "NIMES CENTRE", "iata": None},
    {"origine": "NIMES PONT DU GARD", "iata": None},
]


def _label(origine, code):
    return LABELS.get(code) or origine.title()


INDEX = build_station_index(ROWS, label=_label)


def _find(query):
    return [(m.raw, m.alias) for m in find_stations(query, INDEX)]


def test_search_forms_ignore_accents_punctuation_and_saint():
    assert search_forms("Saint-Étienne") == ("ST ETIENNE", "SAINT ETIENNE")
    assert search_forms("Gare de l'Est") == ("GARE DE L EST", "GARE DE L EST")
    assert search_forms("LYON (intramuros)") == ("LYON INTRAMUROS", "LYON INTRAMUROS")


def test_aliases_only_for_grouped_stations():
    by_raw = {e.raw: e for e in INDEX}
    assert by_raw["LYON (intramuros)"].aliases == ("Lyon Part-Dieu", "Lyon Perrache")
    assert by_raw["ST PIERRE DES CORPS"].aliases == ()  # même nom, une fois normalisé
    assert by_raw["MONTPELLIER SAINT ROCH"].aliases == ()


@pytest.mark.parametrize(
    "query,expected",
    [
        # Noms qui ne trouvaient aucune gare auparavant.
        ("Lyon Part-Dieu", [("LYON (intramuros)", "Lyon Part-Dieu")]),
        ("Part-Dieu", [("LYON (intramuros)", "Lyon Part-Dieu")]),
        ("Montparnasse", [("PARIS (intramuros)", "Paris Montparnasse")]),
        ("Gare du Nord", [("PARIS (intramuros)", "Paris Gare du Nord")]),
        ("Lille Europe", [("LILLE (intramuros)", "Lille Europe")]),
        ("Saint-Pierre-des-Corps", [("ST PIERRE DES CORPS", None)]),
        ("Sain", [("SAINT ETIENNE CHATEAUCREUX", None), ("ST MALO", None), ("ST PIERRE DES CORPS", None)]),
        ("Saint-Étienne", [("SAINT ETIENNE CHATEAUCREUX", None)]),
        ("St Etienne", [("SAINT ETIENNE CHATEAUCREUX", None)]),
        ("Saint-Malo", [("ST MALO", None)]),
        ("Montpellier St-Roch", [("MONTPELLIER SAINT ROCH", None)]),
        ("Marne-la-Vallée", [("MARNE LA VALLEE CHESSY", None)]),
        ("Chessy", [("MARNE LA VALLEE CHESSY", None)]),
        ("Roissy", [("AEROPORT ROISSY CDG 2 TGV", None)]),
        ("Clermont-Ferrand", [("CLERMONT FERRAND", None)]),
        # Inchangé : le début du nom passe avant tout le reste.
        ("Lyon", [("LYON (intramuros)", None), ("LYON ST EXUPERY TGV.", None)]),
        ("Nîmes", [("NIMES CENTRE", None), ("NIMES PONT DU GARD", None)]),
    ],
)
def test_find_stations(query, expected):
    assert _find(query) == expected


def test_no_match_or_empty_query():
    assert _find("zzz") == []
    assert _find(" -- ") == []


@pytest.mark.asyncio
async def test_service_suggests_metropolis_with_hint_and_caches_index():
    trips = MagicMock()
    trips.origin_codes = AsyncMock(return_value=ROWS)
    sync = MagicMock()
    sync.get_last_sync_at = AsyncMock(return_value="sync-1")
    svc = SearchService(MagicMock(), trips, sync, None, MagicMock(), RateLimiter(10))

    suggestions = await svc.search_stations("Montparnasse")
    assert [(s.name, s.raw, s.is_metropolis, s.hint) for s in suggestions] == [
        ("Paris (toutes gares)", "Paris", True, "comprend Paris Montparnasse"),
        ("Paris (Intramuros)", "PARIS (intramuros)", False, "comprend Paris Montparnasse"),
    ]
    assert [s.hint for s in await svc.search_stations("Saint-Malo")] == [None]
    trips.origin_codes.assert_awaited_once()  # index réutilisé tant que la sync ne change pas

    sync.get_last_sync_at = AsyncMock(return_value="sync-2")
    await svc.search_stations("Lyon")
    assert trips.origin_codes.await_count == 2
