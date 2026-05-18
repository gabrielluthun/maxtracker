"""Tests unitaires pour la classification des trains."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train_classifier import classify_train_type


class TestTrainClassifier(unittest.TestCase):
    def test_ter_azurpa_excluded(self):
        self.assertIsNone(classify_train_type("AZURPA", "SUD EST", "NICE VILLE", "ANTIBES"))

    def test_coastal_ter_excluded(self):
        self.assertIsNone(classify_train_type("JCPROVSUD", "SUD EST", "NICE VILLE", "ANTIBES"))

    def test_tgv_inoui_atlantique(self):
        self.assertEqual(
            classify_train_type("PARISBRETA", "ATLANTIQUE", "PARIS (intramuros)", "RENNES"),
            "TGV_INOUI",
        )

    def test_intercites_aro(self):
        self.assertEqual(
            classify_train_type("PALITO", "IC ARO", "LIMOGES BENEDICTINS", "BRIVE LA GAILLARDE"),
            "INTERCITES",
        )

    def test_intercites_nuit(self):
        self.assertEqual(
            classify_train_type("PABRIANCON", "IC NUIT", "PARIS (intramuros)", "CREST"),
            "INTERCITES_NUIT",
        )

    def test_paris_lyon_tgv(self):
        self.assertEqual(
            classify_train_type("PARISRHONE", "SUD EST", "PARIS (intramuros)", "LYON (intramuros)"),
            "TGV_INOUI",
        )

    def test_ouigo_excluded(self):
        self.assertIsNone(
            classify_train_type("OUIGO_paris", "OUIGO_sud-est", "PARIS", "NICE"),
        )


if __name__ == "__main__":
    unittest.main()
