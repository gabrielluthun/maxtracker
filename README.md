# tgvmax-platform

Plateforme de recherche des trains éligibles à l’abonnement TGV Max (TGV INOUI, Intercités, Intercités de nuit) à partir de l’Open Data SNCF.

## Structure

- `back/` — API FastAPI, sync SNCF, MongoDB
  - `app/` — code applicatif (API, services, domaine, persistance)
  - `server.py` — point d'entrée Uvicorn (`uvicorn server:app`)
- `front/` — interface React
- `doc/` — règles de gestion et contraintes

## Démarrage

```bash
# Backend
cd back && pip install -r requirements.txt && uvicorn server:app --reload

# Frontend
cd front && npm install && npm start
```
