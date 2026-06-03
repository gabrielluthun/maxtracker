"""Tests pipeline recherche correspondances (domaine + clés Mongo ciblées)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.domain.connections import (  # noqa: E402
    compose_connected_journeys,
    connection_search_keys,
)


def _doc(
    train_no,
    date,
    origine,
    destination,
    dep,
    arr,
    orig_metro=None,
    dest_metro=None,
):
    return {
        "train_no": train_no,
        "date": date,
        "origine": origine,
        "destination": destination,
        "heure_depart": dep,
        "heure_arrivee": arr,
        "origine_metropolis": orig_metro,
        "destination_metropolis": dest_metro,
        "train_type": "TGV_INOUI",
        "departure_datetime": f"{date}T{dep}:00",
        "origine_iata": "",
        "destination_iata": "",
    }


class TestConnectionSearchKeys(unittest.TestCase):
    def test_extracts_hubs_and_dates(self):
        outbound = [
            _doc("1", "2026-06-10", "LILLE", "PARIS NORD", "08:00", "09:30", "Lille", "Paris"),
            _doc("2", "2026-06-11", "LILLE", "LYON", "08:00", "10:00", "Lille", "Lyon"),
        ]
        hubs, dates = connection_search_keys(outbound, origin_metropolis="Lille")
        self.assertEqual(hubs, frozenset({"Paris", "Lyon"}))
        self.assertEqual(dates, frozenset({"2026-06-10", "2026-06-11"}))

    def test_empty_when_no_hub_legs(self):
        outbound = [
            _doc("1", "2026-06-10", "BREST", "RENNES", "08:00", "09:00", None, None),
        ]
        hubs, dates = connection_search_keys(outbound, origin_metropolis=None)
        self.assertEqual(hubs, frozenset())
        self.assertEqual(dates, frozenset())


class TestComposePipeline(unittest.TestCase):
    def test_lille_marseille_via_paris(self):
        outbound = [
            _doc("1", "2026-06-10", "LILLE", "PARIS NORD", "08:00", "09:30", "Lille", "Paris"),
        ]
        hub_deps = [
            _doc(
                "2",
                "2026-06-10",
                "PARIS (intramuros)",
                "MARSEILLE",
                "10:30",
                "14:00",
                "Paris",
                "Marseille",
            ),
        ]
        journeys = compose_connected_journeys(
            outbound, hub_deps, origin_metropolis="Lille"
        )
        self.assertEqual(len(journeys), 1)
        self.assertEqual(journeys[0].hub_metropolis, "Paris")
        self.assertEqual(journeys[0].destination_metropolis, "Marseille")

    def test_national_multi_hub(self):
        outbound = [
            _doc("1", "2026-06-10", "RENNES", "PARIS NORD", "07:00", "09:00", None, "Paris"),
            _doc("2", "2026-06-10", "RENNES", "LYON", "07:00", "11:00", None, "Lyon"),
        ]
        hub_deps = [
            _doc("3", "2026-06-10", "PARIS NORD", "LYON", "10:00", "12:00", "Paris", "Lyon"),
            _doc("4", "2026-06-10", "PARIS NORD", "MARSEILLE", "10:00", "14:00", "Paris", "Marseille"),
            _doc("5", "2026-06-10", "LYON", "NICE", "13:00", "16:00", "Lyon", "Nice"),
        ]
        journeys = compose_connected_journeys(outbound, hub_deps, origin_metropolis=None)
        hubs = {j.hub_metropolis for j in journeys}
        dests = {j.destination_metropolis for j in journeys}
        self.assertIn("Paris", hubs)
        self.assertTrue(dests & {"Lyon", "Marseille", "Nice"})


if __name__ == "__main__":
    unittest.main()
