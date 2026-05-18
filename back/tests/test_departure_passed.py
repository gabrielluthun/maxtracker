"""Tests du filtrage des départs passés (fuseau Europe/Paris)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.trips import PARIS_TZ, departure_passed, paris_cleanup_cutoff


class TestDeparturePassed:
    def test_18h12_paris_hides_16h57_and_17h57(self):
        now = datetime(2026, 5, 18, 18, 12, tzinfo=PARIS_TZ)
        assert departure_passed("2026-05-18", "16:57", now=now)
        assert departure_passed("2026-05-18", "17:57", now=now)
        assert not departure_passed("2026-05-18", "18:57", now=now)

    def test_paris_cutoff_converts_utc_instant(self):
        utc = datetime(2026, 5, 18, 16, 12, tzinfo=ZoneInfo("UTC"))
        assert paris_cleanup_cutoff(utc) == ("2026-05-18", "18:12")

    def test_previous_day(self):
        now = datetime(2026, 5, 18, 10, 0, tzinfo=PARIS_TZ)
        assert departure_passed("2026-05-17", "22:00", now=now)

    def test_future_day(self):
        now = datetime(2026, 5, 18, 10, 0, tzinfo=PARIS_TZ)
        assert not departure_passed("2026-05-19", "06:00", now=now)
