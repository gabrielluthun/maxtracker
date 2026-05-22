# MaxTracker

**Repérez rapidement les trains TGV Max à 0 €** depuis votre gare de départ — TGV INOUI, Intercités et Intercités de nuit : sans parcourir destination par destination sur SNCF Connect.

MaxTracker aide les titulaires d'un abonnement **MAX Jeune ou MAX Senior** (offres TGV Max) à trouver les trajets éligibles à **0 €** sur les **30 prochains jours**. 
C'est un service **gratuit, indépendant et non officiel** : il ne vend pas de billets et ne réserve pas à votre place. 
Il agrège les données ouvertes SNCF, puis vous **redirige** vers [SNCF Connect](https://www.sncf-connect.com) pour réserver.

---

## Sommaire

- [À quoi ça sert ?](#à-quoi-ça-sert-)
- [Comment l'utiliser](#comment-lutiliser)
- [Ce que vous pouvez faire](#ce-que-vous-pouvez-faire)
- [Bon à savoir](#bon-à-savoir)
- [Avertissement](#avertissement)
- [Pour les développeurs](#pour-les-développeurs)

---

## À quoi ça sert ?

Vous avez un abonnement TGV Max et vous cherchez un aller simple à **0 €** dans les **30 prochains jours**, sans passer des heures sur SNCF Connect. 
MaxTracker interroge une base alimentée par le jeu ouvert [« Disponibilités TGV Max »](https://data.sncf.com/explore/dataset/tgvmax/) publié par SNCF Voyageurs.

Les recherches portent aujourd'hui sur les trajets **sans correspondance** uniquement. La prise en charge des parcours avec correspondance est prévue dans une prochaine version.

**Synchronisation :** la SNCF publie une nouvelle vague de données **chaque jour en début de matinée** (aux alentours de 6 h 30). 
MaxTracker importe ce flux environ **toutes les 15 minutes** lorsque le service tourne : ce n'est pas du temps réel, et permet de rafraîchir la base (trajets éligibles et heures de départ).

Pour le détail des filtres, des horodatages affichés et des écarts possibles avec SNCF Connect, voir la page **À propos** dans l'application (`#/about`) ou le fichier [front/src/pages/About.jsx](front/src/pages/About.jsx).
---

## Fonctionnalités

- Recherche par gare de départ
- Filtres par ville de destination
- Filtres par type de train
- Filtres par créneaux horaires
- *Filtres par correspondance (prévue dans une prochaine version)*

## Comment l'utiliser

1. **Saisissez votre gare de départ** (au moins 3 lettres pour l'autocomplétion)
2. Lancez la recherche
3. Parcourez les résultats **par ville de destination**
4. Affinez avec les **filtres** (départ aujourd'hui, week-end, créneaux horaires, type de train)
5. Changez de vue : **Liste**, **Calendrier** (30 jours) ou **Pics horaires**
6. Cliquez sur un train pour **vérifier et réserver sur SNCF Connect**

**Astuces**

- **Gares favorites** enregistrées localement dans votre navigateur
- **Masquer** une destination que vous ne voulez plus voir (réversible via « Réafficher tout »)
- Badge **« Départ possible aujourd'hui »** sur une destination : au moins un train part encore aujourd'hui vers cette ville
- Badge **« Imminent »** : départ dans moins de 4 heures
- Le header affiche deux horodatages : la dernière publication **SNCF** et la dernière importation **MaxTracker** (ne pas confondre avec l'heure de départ du train)
- Bouton de **sync manuelle** pour forcer un rafraîchissement des données

---

## Ce que vous pouvez faire

| Besoin | Dans l'app |
|--------|------------|
| Voir tous les départs à 0 € depuis une gare | Recherche par gare de départ |
| Comparer les destinations | Liste groupée par ville |
| Ne garder que les départs du jour | Filtre « Départ aujourd'hui » |
| Cibler le week-end ou un créneau | Filtres week-end et horaires |
| Ne garder que TGV INOUI ou Intercités | Filtres par type de train |
| Planifier sur le mois | Vue calendrier |
| Repérer les meilleures heures | Graphique des pics horaires |
| Réserver | Lien SNCF Connect sur chaque train |

Si **aucun train éligible** n'apparaît pour votre gare, l'app vous l'indique clairement : les places se libèrent souvent par vagues, réessayez plus tard.

Si la gare n'est **pas desservie** par l'offre TGV Max, un message d'erreur vous le signale.

---

## Bon à savoir

- **Vérifiez toujours sur SNCF Connect** avant de vous déplacer. Un train éligible affiché ici peut avoir été réservé entre deux mises à jour.
- **Fenêtre de 30 jours** : seuls les départs dans les 30 prochains jours sont indexés (période couverte par l'offre TGV Max et par le jeu de données).
- **Pas de réservation ici** : MaxTracker est un outil de repérage ; la vente et le paiement restent sur les canaux officiels SNCF.
- **Écarts possibles avec SNCF Connect** : l'app officielle s'appuie sur des systèmes privés en temps réel ; MaxTracker n'utilise que le flux public open data.
- **Service non officiel** : MaxTracker n'est pas affilié à la SNCF. Les marques citées appartiennent à leurs propriétaires respectifs.

---

## Avertissement

MaxTracker **n'est pas affilié à la SNCF**. « SNCF », « TGV », « TGV Max », « MAX JEUNE », « MAX ACTIF » et « SNCF Connect » sont des marques déposées de leurs propriétaires respectifs.

Les données affichées proviennent du portail [data.sncf.com](https://data.sncf.com/explore/dataset/tgvmax/), sous la licence indiquée par le portail open data. L'application ne collecte pas d'identifiants SNCF Connect et n'effectue aucune transaction.

---

Les retours se font via les issues GitHub. 
Il n'y a pas de support commercial ni de lien avec la SNCF pour les disponibilités ou les réservations.

<details>
<summary><h2>Pour les développeurs</h2></summary>

### Démarrage local

**Prérequis :** Python 3.11, Node.js 18+, MongoDB (local ou Atlas).

```bash
# Backend
cd back
cp .env.example .env
# MONGO_URL, DB_NAME, CORS_ORIGINS=http://localhost:3000
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

# Frontend (autre terminal)
cd front
npm install
npm start
```

- API : [http://localhost:8000/api/](http://localhost:8000/api/)
- App : [http://localhost:3000](http://localhost:3000)
- OpenAPI : [http://localhost:8000/docs](http://localhost:8000/docs)

Au premier lancement, une sync initiale peut prendre 1–2 min si la base est vide.

### Structure du dépôt

```
tgvmax-platform/
├── back/                          # API FastAPI
│   ├── server.py                  # Point d'entrée Uvicorn
│   ├── requirements.txt
│   ├── runtime.txt                # Version Python (Render)
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                # Application FastAPI
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── routes/            # health, search, stations, sync
│   │   ├── core/                  # logging, rate limiting
│   │   ├── db/
│   │   │   ├── mongodb.py
│   │   │   └── repositories/      # trips, sync_state
│   │   ├── domain/                # stations, trips, train_classifier
│   │   ├── schemas/               # modèles Pydantic
│   │   └── services/
│   │       ├── search.py
│   │       ├── sync.py
│   │       └── sncf/              # client Open Data + SNCF Connect
│   └── tests/
├── front/                         # SPA React (CRA + Craco)
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── AppRouter.jsx      # navigation Recherche / À propos
│   │   │   ├── FiltersPanel.jsx, TrainCard.jsx, CalendarView.jsx…
│   │   │   └── ui/                # composants Radix / shadcn
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── About.jsx
│   │   └── lib/                   # api, storage, tripTime, utils
│   └── package.json
├── doc/
│   ├── regles-de-gestion.md
│   └── contraintes.md
└── .github/workflows/
    └── keep-render-awake.yml      # ping périodique du backend (Render)
```

### Variables d'environnement

**Backend** (`back/.env`) :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `MONGO_URL` | Oui | URI MongoDB |
| `DB_NAME` | Oui | Nom de la base (ex. `tgvmax`) |
| `CORS_ORIGINS` | Oui | Origines autorisées (séparées par des virgules) |

Optionnel (valeurs par défaut dans `app/config.py`) : `sync_interval_min` (15), `rate_limit_per_min` (10).

**Frontend** (build) : `REACT_APP_BACKEND_URL` — URL du backend **sans** `/api`.

### API

Préfixe : `/api`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/` | Santé |
| `GET` | `/search?origin={gare}` | Trajets éligibles depuis une gare |
| `GET` | `/search?origin={gare}&fresh_prices=true` | Recherche + re-contrôle éligibilité SNCF Connect |
| `GET` | `/stations/search?q={texte}` | Autocomplétion gares |
| `GET` | `/sync/info` | État de la synchronisation |
| `POST` | `/sync/trigger` | Sync manuelle (admin / cron) |

### Documentation technique

| Document | Contenu |
|----------|---------|
| [doc/regles-de-gestion.md](doc/regles-de-gestion.md) | Règles de gestion |
| [doc/contraintes.md](doc/contraintes.md) | Contraintes données, métier, légales |
| [front/src/pages/About.jsx](front/src/pages/About.jsx) | Page À propos (filtres, sync, avertissements) |

### Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, Tailwind CSS, Radix UI, Recharts |
| Backend | FastAPI, Uvicorn, Motor, APScheduler |
| Base | MongoDB |
| Source | [Open Data SNCF — tgvmax](https://data.sncf.com/explore/dataset/tgvmax/) |

```mermaid
flowchart LR
  FE[Interface web] --> API[API MaxTracker]
  API --> MONGO[(MongoDB)]
  API --> SNCF[Open Data SNCF]
  FE --> SC[SNCF Connect]
```

### Licence

À définir selon la politique du dépôt. L'usage du jeu de données SNCF est soumis aux [conditions du portail open data](https://data.sncf.com/).

</details>
