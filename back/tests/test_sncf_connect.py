"""Tests de génération des liens SNCF Connect."""
from types import SimpleNamespace
from urllib.parse import unquote

from app.services.sncf.connect import build_sncf_connect_url


def _settings():
    return SimpleNamespace(sncf_connect_base="https://www.sncf-connect.com")


def test_redirect_url_uses_outward_date_dash_format():
    url = build_sncf_connect_url(_settings(), "FRPNO", "FRLLE", "2026-06-20", "08:15")
    decoded = unquote(url)
    assert "/redirect?" in decoded
    assert "outward_date=2026-06-20-08-15" in decoded
    assert "outwardDate" not in decoded
    assert "branch=SHOP" in decoded
    assert "origin_transporter_code=FRPNO" in decoded
    assert "destination_transporter_code=FRLLE" in decoded


def test_redirect_url_pads_single_digit_time():
    url = build_sncf_connect_url(_settings(), "FRPNO", "FRLLE", "2026-06-20", "6:05")
    assert "outward_date=2026-06-20-06-05" in unquote(url)


def test_text_search_fallback_includes_year_and_minutes():
    url = build_sncf_connect_url(
        _settings(), "", "", "2026-06-20", "08:15", "PARIS (intramuros)", "LILLE (intramuros)"
    )
    decoded = unquote(url)
    assert "/app/home/search?" in decoded
    assert "2026" in decoded
    assert "08h15" in decoded
