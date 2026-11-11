"""Tests du moteur de correspondances."""
import unittest

from app.domain.connections import (
    TripSegment,
    build_departures_from_hub_index,
    candidate_connection_dates,
    connectable_hub,
    connection_wait_minutes,
    find_all_connected_journeys,
    hub_date_keys_from_outbound,
    hubs_reachable_as_first_leg,
    is_meaningful_journey,
    minutes_between_arrival_and_departure,
    required_connection_minutes,
    segment_from_trip_doc,
    segments_connect,
)
from app.domain.stations import HUB_METROPOLISES, METROPOLIS_MAP


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


class TestDeduplication(unittest.TestCase):
    def test_same_schedule_different_train_numbers_one_journey(self):
        leg1 = _seg(
            train_no="5224",
            origine="LILLE (intramuros)",
            destination="ANGERS SAINT LAUD",
            heure_depart="09:36",
            heure_arrivee="14:02",
            origine_metropolis="Lille",
            destination_metropolis="Angers",
        )
        leg2a = _seg(
            train_no="12472",
            origine="ANGERS SAINT LAUD",
            destination="PARIS (intramuros)",
            heure_depart="15:44",
            heure_arrivee="17:27",
            origine_metropolis="Angers",
            destination_metropolis="Paris",
        )
        leg2b = _seg(
            train_no="8922",
            origine="ANGERS SAINT LAUD",
            destination="PARIS (intramuros)",
            heure_depart="15:44",
            heure_arrivee="17:27",
            origine_metropolis="Angers",
            destination_metropolis="Paris",
        )
        leg3 = _seg(
            train_no="6925",
            origine="PARIS (intramuros)",
            destination="LYON ST EXUPERY TGV",
            heure_depart="18:14",
            heure_arrivee="20:05",
            origine_metropolis="Paris",
            destination_metropolis="Lyon",
        )
        journeys = find_all_connected_journeys(
            [leg1],
            [leg2a, leg2b, leg3],
            origin_metropolis="Lille",
            max_connections=2,
        )
        three = [j for j in journeys if j.connection_count == 2]
        self.assertEqual(len(three), 1)


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


class TestOvernightAndMidnight(unittest.TestCase):
    """Le flux SNCF date un train par son jour de départ, même s'il arrive le lendemain."""

    def setUp(self):
        # Paris → Toulouse de nuit : part le 12 à 22:00, arrive le 13 à 07:30.
        self.night = _seg(
            train_no="3753",
            date="2026-11-12",
            origine="PARIS AUSTERLITZ",
            destination="TOULOUSE MATABIAU",
            heure_depart="22:00",
            heure_arrivee="07:30",
            origine_metropolis="Paris",
            destination_metropolis="Toulouse",
            train_type="INTERCITES_NUIT",
        )

    def _toulouse_bordeaux(self, date, heure_depart):
        return _seg(
            train_no="8500",
            date=date,
            origine="TOULOUSE MATABIAU",
            destination="BORDEAUX ST JEAN",
            heure_depart=heure_depart,
            heure_arrivee="10:30" if heure_depart < "10:30" else "23:59",
            origine_metropolis="Toulouse",
            destination_metropolis="Bordeaux",
        )

    def test_night_train_rejects_connection_departing_before_it(self):
        # Le TGV du 12 à 08:30 part 13 h 30 AVANT le train de nuit.
        before = self._toulouse_bordeaux("2026-11-12", "08:30")
        self.assertFalse(segments_connect(self.night, before))
        journeys = find_all_connected_journeys(
            [self.night], [before], origin_metropolis="Paris", max_connections=1
        )
        self.assertEqual(journeys, [])

    def test_night_train_connects_next_morning(self):
        next_morning = self._toulouse_bordeaux("2026-11-13", "08:30")
        journeys = find_all_connected_journeys(
            [self.night], [next_morning], origin_metropolis="Paris", max_connections=1
        )
        self.assertEqual(len(journeys), 1)
        self.assertEqual(journeys[0].connection_minutes, 60)
        # 22:00 le 12 → 10:30 le 13
        self.assertEqual(journeys[0].total_duration_minutes, 12 * 60 + 30)

    def test_candidate_dates_follow_real_arrival_day(self):
        self.assertEqual(candidate_connection_dates(self.night), ("2026-11-13",))

    def test_late_arrival_can_connect_after_midnight_next_day(self):
        leg1 = _seg(
            date="2026-11-12",
            heure_depart="21:00",
            heure_arrivee="23:30",
            origine_metropolis="Lille",
            destination_metropolis="Paris",
        )
        after_midnight = _seg(
            train_no="2",
            date="2026-11-13",
            origine="PARIS (intramuros)",
            heure_depart="00:30",
            heure_arrivee="06:00",
            origine_metropolis="Paris",
            destination_metropolis="Nice",
        )
        self.assertEqual(candidate_connection_dates(leg1), ("2026-11-12", "2026-11-13"))
        self.assertTrue(segments_connect(leg1, after_midnight))
        self.assertEqual(connection_wait_minutes(leg1, after_midnight), 60)

    def test_same_date_early_departure_is_not_wrapped_to_next_day(self):
        # Ancien bug : 23:30 → 00:20 « même date » était compté comme 50 min d'attente.
        leg1 = _seg(
            date="2026-11-12",
            heure_depart="21:00",
            heure_arrivee="23:30",
            origine_metropolis="Lille",
            destination_metropolis="Paris",
        )
        same_day_early = _seg(
            train_no="2",
            date="2026-11-12",
            origine="PARIS (intramuros)",
            heure_depart="00:20",
            heure_arrivee="06:00",
            origine_metropolis="Paris",
            destination_metropolis="Nice",
        )
        self.assertFalse(segments_connect(leg1, same_day_early))

    def test_hub_date_keys_use_arrival_day(self):
        doc = {
            "train_no": "3753",
            "date": "2026-11-12",
            "origine": "PARIS AUSTERLITZ",
            "destination": "TOULOUSE MATABIAU",
            "heure_depart": "22:00",
            "heure_arrivee": "07:30",
            "origine_metropolis": "Paris",
            "destination_metropolis": "Toulouse",
        }
        keys = hub_date_keys_from_outbound([doc], origin_metropolis="Paris")
        self.assertEqual(keys, frozenset({("2026-11-13", "Toulouse")}))

    def test_missing_date_never_connects(self):
        leg1 = _seg(date="", origine_metropolis="Lille", destination_metropolis="Paris")
        leg2 = _seg(date="", origine_metropolis="Paris", destination_metropolis="Lyon",
                    heure_depart="10:00")
        self.assertFalse(segments_connect(leg1, leg2))
        self.assertEqual(candidate_connection_dates(leg1), ())
