"""Pytest configuration — assure l'import du package app depuis back/."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Valeurs par défaut pour importer app.main sans .env (CI). Aucune connexion
# Mongo n'est ouverte à l'import : le client n'est créé que dans le lifespan.
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "tgvmax_test")
