"""Tests des deep links SNCF Connect."""
from server import sncf_connect_url


class TestSncfConnectUrl:
    def test_night_train_montauban(self):
        url = sncf_connect_url("FRPAZ", "FRXMW", "2026-05-19", "22:13")
        assert "/redirect?" in url
        assert "origin_transporter_code=FRPAZ" in url
        assert "destination_transporter_code=FRXMW" in url
        assert "redirection_type=SEARCH" in url
        assert "nb_pax=1" in url
        assert "outwardDate=2026-05-19T22%3A13%3A00" in url

    def test_night_train_nice(self):
        url = sncf_connect_url("FRPAZ", "FRNIC", "2026-06-09", "20:57")
        assert "origin_transporter_code=FRPAZ" in url
        assert "destination_transporter_code=FRNIC" in url
        assert "outwardDate=2026-06-09T20%3A57%3A00" in url

    def test_fallback_without_station_codes(self):
        url = sncf_connect_url("", "", "2026-05-19", "20:57", "PARIS", "NICE VILLE")
        assert "/app/home/search" in url
        assert "q=" in url
        assert "PARIS" in url
        assert "NICE" in url
