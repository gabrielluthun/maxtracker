"""Point d'entrée Uvicorn (compatibilité : uvicorn server:app)."""
from app.main import app

__all__ = ["app"]
