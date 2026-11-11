# Sync SNCF → Mongo → warm cache

Toutes les 15 min, on lit d’abord `sncf_data_updated_at`. Si inchangé **et** si les données ont été traitées par la version actuelle du code (`PIPELINE_VERSION`) : **rien** (pas d’export, pas de warm). `POST /api/sync/trigger` force toujours un rebuild.

Une seule sync tourne à la fois : une sync demandée pendant qu’une autre tourne renvoie `{"status": "skipped", "reason": "sync_in_progress"}`. La sync manuelle est limitée à **1 toutes les 3 min pour tout le monde** (au-delà : HTTP 429 + `Retry-After`).

Rebuild : export SNCF → filtre J à J+30 → `replace_all` (staging puis bascule atomique) → `last_sync_at` → warm en fond (L1 vidé, L2 gzip).

Les départs déjà passés sont retirés **à la lecture** du cache, même sans warm.

Si l’API SNCF est down : erreur enregistrée, trips inchangés. Si le metadata est illisible : on fait l’export (pas de skip à l’aveugle).

```mermaid
flowchart TD
  T[cron 15 min ou POST /sync/trigger] --> LK{sync déjà en cours ?}
  LK -->|oui| BZ[skipped — sync_in_progress]
  LK -->|non| A[metadata SNCF]
  A --> S{timestamp inchangé,<br/>même PIPELINE_VERSION<br/>et pas force ?}
  S -->|oui| SK[skip — trips et cache inchangés]
  S -->|non| B[fetch export SNCF]
  B --> C{données OK ?}
  C -->|non| E[sync_state = error<br/>trips inchangés]
  C -->|oui| D[filtre TGVMax J à J+30]
  D --> R["replace_all : INSERT dans trips_staging<br/>par lots de 5000 + index"]
  R --> RN["renameCollection trips_staging → trips<br/>bascule atomique"]
  RN --> F[nettoie les départs déjà passés aujourd'hui]
  F --> G[écrit last_sync_at = maintenant]
  G --> H[lance warm_cache en arrière-plan]
  H --> I[clear L1 mémoire]
  I --> J[recalcule chaque origine]
  J --> K[écrit L1 + L2 gzip]
  K --> L[prune L2 dont sync_at ≠ last_sync_at]
```
