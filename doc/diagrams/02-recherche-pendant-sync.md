# Recherche pendant le fetch / `replace_all`

`last_sync_at` n’a pas encore changé. Le cache est donc encore considéré à jour : on sert l’**ancienne** réponse, sans refresh.

Une origine **sans cache** est calculée sur `trips`. Le nouveau jeu est écrit dans `trips_staging`, puis basculé d’un seul coup (`renameCollection`) : le calcul voit soit l’ancien jeu complet, soit le nouveau, **jamais** une collection vide ou à moitié remplie.

```mermaid
flowchart TD
  Q[GET /search?origin=...] --> L1{L1 mémoire ?}
  L1 -->|hit| R[renvoie l'ancien résultat<br/>pas de refresh]
  L1 -->|miss| L2{L2 Mongo gzip ?}
  L2 -->|hit| R
  L2 -->|miss| C[compute sur trips<br/>ancien ou nouveau jeu complet]
```
