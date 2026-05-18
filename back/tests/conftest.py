"""Pytest configuration — assure l'import du package app depuis back/."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
