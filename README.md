# tgvmax-platform

Plateforme de recherche des trains éligibles à l’abonnement TGV Max (TGV INOUI, Intercités, Intercités de nuit) à partir de l’Open Data SNCF.

## Structure

- `back/` — API FastAPI, sync SNCF, MongoDB
- `front/` — interface React
- `doc/` — règles de gestion et contraintes

## Démarrage

```bash
# Backend
cd back && pip install -r requirements.txt && uvicorn server:app --reload

# Frontend
cd front && npm install && npm start
```
