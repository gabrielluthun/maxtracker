"""Tests de résolution des libellés de gare."""
from unittest.mock import patch

from app.domain.station_labels import (
    TRANSPORTER_CODE_OVERRIDES,
    clear_trigramme_cache,
    display_station_name,
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
