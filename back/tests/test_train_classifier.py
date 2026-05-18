"""Tests unitaires pour la classification des trains."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train_classifier import classify_train_type


class TestTrainClassifier(unittest.TestCase):
    def test_ter_entity_excluded(self):
        self.assertIsNone(
            classify_train_type("AZURPA", "SUD EST", "NICE VILLE", "ANTIBES", "6174")
        )

    def test_ter_exclusive_train_number(self):
        self.assertIsNone(
            classify_train_type("UNKNOWN", "SUD EST", "A", "B", "6174")
        )

    def test_jc_correspondance_ter_segment_excluded(self):
        self.assertIsNone(
            classify_train_type("JCPROVSUD", "SUD EST", "NICE VILLE", "ANTIBES", "6805")
        )

    def test_jc_correspondance_tgv_segment_included(self):
        self.assertEqual(
            classify_train_type(
                "JCPROVSUD", "SUD EST", "AVIGNON TGV", "MARSEILLE ST CHARLES", "6805"
            ),
            "TGV_INOUI",
        )

    def test_tgv_inoui_atlantique(self):
        self.assertEqual(
            classify_train_type("PARISBRETA", "ATLANTIQUE", "PARIS (intramuros)", "RENNES", "12209"),
            "TGV_INOUI",
        )

    def test_intercites_aro(self):
        self.assertEqual(
            classify_train_type("PALITO", "IC ARO", "LIMOGES BENEDICTINS", "BRIVE LA GAILLARDE", "3615"),
            "INTERCITES",
        )

    def test_intercites_nuit(self):
        self.assertEqual(
            classify_train_type("PABRIANCON", "IC NUIT", "PARIS (intramuros)", "CREST", "5787"),
            "INTERCITES_NUIT",
        )

    def test_paris_lyon_tgv(self):
        self.assertEqual(
            classify_train_type("PARISRHONE", "SUD EST", "PARIS (intramuros)", "LYON (intramuros)", "6621"),
            "TGV_INOUI",
        )

    def test_ouigo_classified_as_tgv_inoui(self):
        self.assertEqual(
            classify_train_type("OUIGO_paris centre <> nice", "OUIGO_sud-est", "PARIS", "NICE", "7856"),
            "TGV_INOUI",
        )


if __name__ == "__main__":
    unittest.main()
