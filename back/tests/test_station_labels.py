"""Tests de résolution des libellés de gare."""
from unittest.mock import patch

import httpx
import pytest

from app.domain.station_labels import (
    TRANSPORTER_CODE_OVERRIDES,
    clear_trigramme_cache,
    display_station_name,
    refresh_trigramme_map,
    refresh_trigramme_map_if_stale,
)


def setup_function():
    clear_trigramme_cache()


def test_paris_nord_via_trigramme():
    fake_map = {"PNO": "Paris Gare du Nord"}
    with patch("app.domain.station_labels._load_trigramme_map", return_value=fake_map):
        assert display_station_name("PARIS (intramuros)", "FRPNO") == "Paris Gare du Nord"


def test_lille_europe_via_override():
    assert display_station_name("LILLE (intramuros)", "FRLLE") == TRANSPORTER_CODE_OVERRIDES["FRLLE"]


def test_title_case_without_code():
    assert display_station_name("MARSEILLE ST CHARLES") == "Marseille St Charles"


def test_intramuros_fallback_without_code():
    assert display_station_name("PARIS (intramuros)") == "Paris"


def test_trigramme_rejected_when_city_mismatch():
    fake_map = {"PNO": "Poitiers"}
    with patch("app.domain.station_labels._load_trigramme_map", return_value=fake_map):
        assert display_station_name("PARIS (intramuros)", "FRPNO") == "Paris"


def test_paris_est_via_override():
    assert display_station_name("PARIS (intramuros)", "FRPST") == "Paris Gare de l'Est"


def test_paris_montparnasse_via_override():
    assert display_station_name("PARIS (intramuros)", "FRPMO") == "Paris Montparnasse"


def test_bordeaux_st_jean_rejects_wrong_trigramme():
    fake_map = {"BOJ": "Bonneval", "BXJ": "Bordeaux Saint-Jean"}
    with patch("app.domain.station_labels._load_trigramme_map", return_value=fake_map):
        assert display_station_name("BORDEAUX ST JEAN", "FRBOJ") == "Bordeaux St Jean"


def test_angouleme_keeps_accent_when_trigramme_matches():
    fake_map = {"ANG": "Angoulême"}
    with patch("app.domain.station_labels._load_trigramme_map", return_value=fake_map):
        assert display_station_name("ANGOULEME", "FRANG") == "Angoulême"


def test_dol_de_bretagne_trigramme_match():
    fake_map = {"DOL": "Dol-de-Bretagne"}
    with patch("app.domain.station_labels._load_trigramme_map", return_value=fake_map):
        assert display_station_name("DOL DE BRETAGNE", "FRDOL") == "Dol-de-Bretagne"


# --- Chargement asynchrone du référentiel -----------------------------------

_GARES_URL = "https://example.test/gares"


def _transport(handler):
    return httpx.MockTransport(handler)


def _ok_rows(_request):
    return httpx.Response(200, json=[
        {"libellecourt": "pno", "nom": "Paris Gare du Nord"},
        {"libellecourt": "", "nom": "Sans code"},
    ])


def _server_error(_request):
    return httpx.Response(503)


@pytest.mark.asyncio
async def test_refresh_loads_referential_used_by_display():
    loaded = await refresh_trigramme_map(url=_GARES_URL, transport=_transport(_ok_rows))
    assert loaded == 1
    assert display_station_name("PARIS (intramuros)", "FRPNO") == "Paris Gare du Nord"


@pytest.mark.asyncio
async def test_failed_refresh_keeps_previous_referential():
    await refresh_trigramme_map(url=_GARES_URL, transport=_transport(_ok_rows))
    assert await refresh_trigramme_map(url=_GARES_URL, transport=_transport(_server_error)) == 0
    assert display_station_name("PARIS (intramuros)", "FRPNO") == "Paris Gare du Nord"


@pytest.mark.asyncio
async def test_failed_first_load_is_retried_by_if_stale():
    assert await refresh_trigramme_map_if_stale(
        url=_GARES_URL, transport=_transport(_server_error)
    ) == 0
    # Échec non mémorisé : le prochain passage réessaie.
    assert await refresh_trigramme_map_if_stale(
        url=_GARES_URL, transport=_transport(_ok_rows)
    ) == 1


@pytest.mark.asyncio
async def test_fresh_referential_is_not_refetched():
    await refresh_trigramme_map(url=_GARES_URL, transport=_transport(_ok_rows))
    calls = []

    def counting(request):
        calls.append(request)
        return _ok_rows(request)

    assert await refresh_trigramme_map_if_stale(
        url=_GARES_URL, transport=_transport(counting)
    ) == 0
    assert calls == []


def test_display_never_hits_network_when_referential_missing():
    # Référentiel vide (setup_function) : aucun appel réseau, repli sur le libellé SNCF.
    with patch("httpx.Client", side_effect=AssertionError("network call")), \
         patch("httpx.AsyncClient", side_effect=AssertionError("network call")):
        assert display_station_name("PARIS (intramuros)", "FRPNO") == "Paris"
