"""Tests du moteur de correspondances (tous hubs métropolitains)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.domain.connections import (  # noqa: E402
    TripSegment,
    build_departures_from_hub_index,
    connectable_hub,
    find_all_connected_journeys,
    hubs_reachable_as_first_leg,
    is_meaningful_journey,
    minutes_between_arrival_and_departure,
    required_connection_minutes,
    segment_from_trip_doc,
    segments_connect,
)
from app.domain.stations import HUB_METROPOLISES, METROPOLIS_MAP  # noqa: E402


def _seg(**kwargs) -> TripSegment:
    defaults = dict(
        train_no="1",
        date="2026-06-10",
        origine="A",
        destination="B",
        heure_depart="08:00",
        heure_arrivee="09:00",
        origine_metropolis=None,
        destination_metropolis=None,
        train_type="TGV_INOUI",
        segment_id="",
    )
    defaults.update(kwargs)
    if not defaults["segment_id"]:
        defaults["segment_id"] = (
            f"{defaults['train_no']}|{defaults['date']}|{defaults['origine']}|{defaults['destination']}"
        )
    return TripSegment(**defaults)


class TestHubRegistry(unittest.TestCase):
    def test_all_metropolis_map_values_are_hubs(self):
        self.assertIn("Paris", HUB_METROPOLISES)
        self.assertIn("Lyon", HUB_METROPOLISES)
        self.assertEqual(len(HUB_METROPOLISES), len(METROPOLIS_MAP))


class TestConnectionRules(unittest.TestCase):
    def test_multi_gare_same_metropolis(self):
        self.assertEqual(
            required_connection_minutes(
                "PARIS NORD",
                "PARIS (intramuros)",
                leg1_destination_metropolis="Paris",
                leg2_origine_metropolis="Paris",
            ),
            50,
        )

    def test_same_station(self):
        self.assertEqual(
            required_connection_minutes(
                "LYON PART DIEU",
                "LYON PART DIEU",
                leg1_destination_metropolis="Lyon",
                leg2_origine_metropolis="Lyon",
            ),
            25,
        )

    def test_different_metropolises_incompatible(self):
        self.assertIsNone(connectable_hub(
            _seg(
                origine_metropolis="Lyon",
                destination_metropolis="Paris",
                heure_arrivee="10:00",
            ),
            _seg(
                origine_metropolis="Lille",
                destination_metropolis="Marseille",
                heure_depart="11:00",
            ),
        ))


class TestLilleMarseilleViaParis(unittest.TestCase):
    def setUp(self):
        self.leg1 = _seg(
            train_no="7001",
            origine="LILLE EUROPE",
            destination="PARIS NORD",
            heure_depart="08:00",
            heure_arrivee="09:30",
            origine_metropolis="Lille",
            destination_metropolis="Paris",
        )
        self.leg2 = _seg(
            train_no="6201",
            origine="PARIS (intramuros)",
            destination="MARSEILLE ST CHARLES",
            heure_depart="10:30",
            heure_arrivee="14:00",
            origine_metropolis="Paris",
            destination_metropolis="Marseille",
        )

    def test_connects_via_paris(self):
        self.assertEqual(connectable_hub(self.leg1, self.leg2), "Paris")
        self.assertTrue(segments_connect(self.leg1, self.leg2))

    def test_too_short_transfer_rejected(self):
        short = _seg(
            train_no="6200",
            origine="PARIS (intramuros)",
            destination="MARSEILLE ST CHARLES",
            heure_depart="10:00",
            origine_metropolis="Paris",
            destination_metropolis="Marseille",
        )
        self.assertFalse(segments_connect(self.leg1, short))

    def test_find_all_filtered_to_marseille(self):
        journeys = find_all_connected_journeys(
            [self.leg1],
            [self.leg2],
            origin_metropolis="Lille",
            destination_metropolis="Marseille",
        )
        self.assertEqual(len(journeys), 1)
        self.assertEqual(journeys[0].hub_metropolis, "Paris")
        self.assertEqual(journeys[0].connection_minutes, 60)

    def test_multiple_valid_second_legs(self):
        late = _seg(
            train_no="6202",
            origine="PARIS NORD",
            destination="MARSEILLE ST CHARLES",
            heure_depart="12:00",
            heure_arrivee="15:30",
            origine_metropolis="Paris",
            destination_metropolis="Marseille",
        )
        journeys = find_all_connected_journeys(
            [self.leg1],
            [self.leg2, late],
            origin_metropolis="Lille",
            destination_metropolis="Marseille",
        )
        self.assertEqual(len(journeys), 2)


class TestStrasbourgNiceViaLyon(unittest.TestCase):
    def test_lyon_hub(self):
        leg1 = _seg(
            train_no="100",
            origine="STRASBOURG",
            destination="LYON PART DIEU",
            heure_depart="07:00",
            heure_arrivee="09:00",
            origine_metropolis=None,
            destination_metropolis="Lyon",
        )
        leg2 = _seg(
            train_no="200",
            origine="LYON PART DIEU",
            destination="NICE VILLE",
            heure_depart="09:30",
            heure_arrivee="12:00",
            origine_metropolis="Lyon",
            destination_metropolis="Nice",
        )
        self.assertTrue(segments_connect(leg1, leg2))
        j = find_all_connected_journeys(
            [leg1], [leg2], destination_metropolis="Nice"
        )
        self.assertEqual(j[0].hub_metropolis, "Lyon")


class TestExclusions(unittest.TestCase):
    def test_return_to_origin_excluded(self):
        leg1 = _seg(
            origine_metropolis="Lille",
            destination_metropolis="Paris",
            heure_arrivee="09:30",
        )
        leg2 = _seg(
            origine_metropolis="Paris",
            destination_metropolis="Lille",
            heure_depart="11:00",
        )
        self.assertFalse(is_meaningful_journey(leg1, leg2))
        self.assertFalse(segments_connect(leg1, leg2))

    def test_first_leg_same_hub_as_origin_skipped(self):
        paris_paris = _seg(
            origine_metropolis="Paris",
            destination_metropolis="Paris",
            heure_arrivee="09:00",
        )
        out = _seg(
            origine_metropolis="Paris",
            destination_metropolis="Lyon",
            heure_depart="10:00",
        )
        self.assertEqual(
            find_all_connected_journeys(
                [paris_paris], [out], origin_metropolis="Paris"
            ),
            [],
        )


class TestIndexAndHelpers(unittest.TestCase):
    def test_build_index_groups_by_date_and_hub(self):
        a = _seg(date="2026-06-10", origine_metropolis="Paris", train_no="1")
        b = _seg(date="2026-06-10", origine_metropolis="Paris", train_no="2")
        c = _seg(date="2026-06-11", origine_metropolis="Paris", train_no="3")
        idx = build_departures_from_hub_index([a, b, c])
        self.assertEqual(len(idx[("2026-06-10", "Paris")]), 2)
        self.assertEqual(len(idx[("2026-06-11", "Paris")]), 1)

    def test_hubs_reachable_from_origin(self):
        legs = [
            _seg(destination_metropolis="Paris", origine_metropolis="Lille"),
            _seg(destination_metropolis="Lyon", origine_metropolis="Lille"),
            _seg(destination_metropolis="Lille", origine_metropolis="Lille"),
        ]
        self.assertEqual(
            hubs_reachable_as_first_leg(legs, origin_metropolis="Lille"),
            frozenset({"Paris", "Lyon"}),
        )

    def test_segment_from_trip_doc(self):
        doc = {
            "train_no": "1",
            "date": "2026-06-10",
            "origine": "LILLE",
            "destination": "PARIS NORD",
            "heure_depart": "08:00",
            "heure_arrivee": "09:30",
            "origine_metropolis": "Lille",
            "destination_metropolis": "Paris",
            "train_type": "TGV_INOUI",
        }
        s = segment_from_trip_doc(doc)
        self.assertEqual(s.destination_metropolis, "Paris")
        self.assertTrue(s.segment_id.endswith("PARIS NORD"))


class TestAllHubsDiscoverable(unittest.TestCase):
    """Chaque hub peut théoriquement apparaître comme connectable_hub."""

    def test_connectable_hub_matches_destination_and_origin_metropolis(self):
        for hub in sorted(HUB_METROPOLISES):
            leg1 = _seg(
                destination_metropolis=hub,
                origine_metropolis="Lille" if hub != "Lille" else "Paris",
                heure_arrivee="10:00",
            )
            leg2 = _seg(
                origine_metropolis=hub,
                destination_metropolis="Marseille" if hub != "Marseille" else "Nice",
                heure_depart="11:00",
            )
            self.assertEqual(connectable_hub(leg1, leg2), hub)


if __name__ == "__main__":
    unittest.main()
