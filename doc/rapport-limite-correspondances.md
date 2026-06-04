# Rapport — Limitation technique dû à la profondeur des parcours avec correspondance

> _Décision technique et produit, justifiée par des mesures sur données réelles._

### **Problème**

Le moteur de composition des parcours avec correspondance produit des réponses `/search` qui **dépassent la limite de 16 Mo par document MongoDB**.

### **Lexique**

- **Parcours composé** : un parcours avec correspondance, c'est-à-dire un parcours qui passe par une ou plusieurs gares avant d'arriver à la destination finale.
- **Parcours direct** : un parcours qui ne passe pas par une gare de correspondance et qui arrive directement à la destination.
- **Origine** : une gare de départ.

---

## 1. Résumé exécutif

L'outil de recherche prend en compte des parcours TGV Max à **0 €** avec correspondance.
Il était configuré pour enchaîner **jusqu'à deux correspondances** (soit trois trains).
Cette profondeur provoque une **explosion combinatoire exponentielle** des parcours dits « composés » (c'est-à-dire avec correspondance), ce qui entraîne **deux conséquences bloquantes** en production, étroitement liées.

**D'une part**, certaines réponses `/search` deviennent _non cachables_ : elles dépassent la limite stricte de **16 Mo par document MongoDB**, ce qui provoque une erreur `DocumentTooLarge` au moment de la mise en cache.
Le cache n'est alors _jamais_ rempli pour ces origines.
**D'autre part** — et c'est la conséquence directe du point précédent —, ces gares subissent une **latence d'environ 30 secondes** : faute de cache, chaque recherche recalcule l'intégralité des parcours en direct, le calcul des correspondances étant particulièrement coûteux en ressources MongoDB.

Ce rapport présente le diagnostic, les mesures et l'analyse qui mènent à la **décision détaillée en conclusion** (§ 11).

---

## 2. Contexte technique

Les données proviennent du jeu open data SNCF **« Disponibilités TGV Max »**, importé en base **toutes les quinze minutes** environ ; l'instantané mesuré pour ce rapport comptait **38 985 trajets** répartis sur **205 origines distinctes**.
Après chaque import, chaque réponse `/search` est pré-calculée par la fonction `warm_cache`, puis stockée dans MongoDB (collection `search_cache`) à raison d'une **entrée par origine** ; les recherches des utilisateurs sont ensuite servies directement depuis ce cache.

La lecture du cache suit une stratégie de type _stale-while-revalidate_ : si une entrée existe, elle est servie **immédiatement** — même lorsqu'elle date d'un import antérieur —, tandis qu'un recalcul est déclenché _en arrière-plan_ pour la rafraîchir.
L'objectif est qu'**aucune requête utilisateur ne déclenche jamais le calcul lourd de façon bloquante**.

À cela s'ajoute une **contrainte dure et non négociable** : un document BSON **ne peut pas dépasser 16 Mo**.
Au-delà de cette taille, l'écriture en base échoue avec l'erreur `DocumentTooLarge`.

---

## 3. Historique du diagnostic

Le symptôme remonté était _« la recherche prend 30 s avant d'afficher les disponibilités »_.
L'investigation a révélé **deux causes distinctes**, qui ont été traitées successivement.

La **cause initiale** était un _déploiement bloqué_ : la production tournait sur un commit antérieur à toute la fonctionnalité de cache.
Aucun cache n'existait donc, et chaque recherche était par conséquent calculée en direct, d'où les quelque **30 secondes** d'attente.
Ce premier problème a été **résolu** en redéployant la branche à jour.

Une **seconde cause**, mise au jour après cette correction, s'est révélée _plus profonde_ : une fois le code de cache déployé, le `warm_cache` échouait sur les grosses origines (`AVIGNON TGV`, `BEZIERS`, etc.) parce que leur payload dépassait **16 Mo**.
Le cache restait donc vide pour ces gares, qui retombaient aux 30 secondes de latence.
**C'est précisément l'objet de ce rapport.**

> Note : ce n'était **ni** un problème de mémoire **ni** de CPU du plan gratuit Render, mais bien la limite des 16 Mo d'un document Mongo.

---

## 4. Méthodologie de mesure

Les mesures s'appuient sur le script `back/scripts/measure_payloads.py`.
Pour chaque origine, celui-ci calcule la réponse `/search` réelle, puis sérialise le payload JSON selon **trois variantes cumulatives**.
La première, **« direct seul »**, ne retient que les trajets directs.
La deuxième, **« + 1 corresp. »**, ajoute aux directs les parcours à _une_ correspondance (deux segments).
La troisième, **« + 2 corresp. »**, ajoute encore les parcours à _deux_ correspondances (trois segments) et correspond donc à la **réponse complète de l'ancien comportement**.

Le découpage par niveau s'appuie sur le champ `connection_count` de chaque parcours composé.
Les chiffres présentés ci-dessous proviennent d'un **instantané réel** de la base de production, comptant **38 985 trajets** sur **205 origines**.

---

## 5. Mesures

### 5.1 Top 10 des origines par volume (réponse complète, comportement à 2 corresp.)

_Trié par taille du payload « + 2 corresp. » décroissante._

|   # | Origine                        | direct seul | + 1 corresp. | + 2 corresp. | nb trajets-directs | nb trajets-1-corresp. | nb trajets-2-corresp. |
| --: | ------------------------------ | ----------: | -----------: | -----------: | -----------------: | --------------------: | --------------------: |
|   1 | GRENOBLE                       |      101 Ko |       5,0 Mo |  **38,2 Mo** |                126 |                 2 916 |                13 987 |
|   2 | SAINT ETIENNE CHATEAUCREUX     |       99 Ko |       4,3 Mo |  **36,6 Mo** |                116 |                 2 416 |                13 390 |
|   3 | PARIS (INTRAMUROS)             |      1,7 Mo |       9,4 Mo |  **35,2 Mo** |              2 665 |                 4 569 |                10 765 |
|   4 | MONTAUBAN VILLE BOURBON        |      564 Ko |       7,9 Mo |  **34,3 Mo** |                825 |                 4 250 |                10 890 |
|   5 | BORDEAUX ST JEAN               |      830 Ko |       9,2 Mo |  **32,3 Mo** |              1 259 |                 4 926 |                 9 633 |
|   6 | NIMES CENTRE                   |      534 Ko |       7,0 Mo |  **32,0 Mo** |                805 |                 3 800 |                10 389 |
|   7 | AGEN                           |      325 Ko |       5,9 Mo |  **30,9 Mo** |                486 |                 3 374 |                10 496 |
|   8 | AVIGNON TGV                    |      217 Ko |       3,9 Mo |  **29,8 Mo** |                302 |                 2 159 |                10 897 |
|   9 | LYON (métropole)               |      920 Ko |      12,6 Mo |  **28,9 Mo** |              1 368 |                 6 936 |                 6 887 |
|  10 | LE CREUSOT MONTCEAU MONTCHANIN |      147 Ko |       4,5 Mo |  **27,7 Mo** |                187 |                 2 546 |                 9 542 |

**Lecture** : la colonne « + 2 corresp. » dépasse _partout_ 16 Mo, tandis que la colonne « + 1 corresp. » repasse _partout_ sous la limite.
Le volume vient quasi exclusivement des **correspondances** (les parcours directs restent **≤ 2 665**).

### 5.2 Agrégat sur les 205 origines

| Niveau                       | Cache total | Plus gros payload  | Origines > 16 Mo |
| ---------------------------- | ----------- | ------------------ | ---------------- |
| Direct seul                  | 33,6 Mo     | 1,7 Mo             | **0**            |
| **+ 1 correspondance**       | 390,7 Mo    | **12,6 Mo** (Lyon) | **0**            |
| + 2 correspondances          | **1,6 Go**  | 38,2 Mo (Grenoble) | **32**           |

---

## 6. Analyse des mesures

Les mesures montrent sans ambiguïté que ce sont les parcours à **2 correspondances (3 trains)** qui provoquent l'explosion du volume.
À ce niveau, le cache total passe de **391 Mo à 1,6 Go** et **32 origines** se retrouvent au-dessus de la limite de 16 Mo, ce qui les rend tout simplement incachables : pour ces gares, chaque recherche doit être recalculée en direct, d'où la latence de ~30 s constatée.

Dès lors qu'on se limite à **1 correspondance**, la situation se normalise complètement.
Le plus gros payload n'est plus que de **12,6 Mo** (pour Lyon) et **aucune** origine ne dépasse 16 Mo : toutes les réponses redeviennent cachables, et donc servies quasi instantanément depuis le cache.

Il faut souligner que cette inflation provient exclusivement des correspondances, et non des trajets directs : ces derniers restent partout modestes (au plus 2 665 trajets directs, pour Paris).
Autrement dit, ce n'est pas le volume de l'offre TGV Max qui pose problème, mais la combinatoire introduite par l'enchaînement de plusieurs trains.

Enfin, au-delà de la contrainte de stockage MongoDB, renvoyer plus de 30 Mo de JSON — soit des dizaines de milliers de parcours — pénalise lourdement le transfert réseau et le rendu côté navigateur, pour une information qu'aucun utilisateur n'exploite réellement.
Limiter à 1 correspondance améliore donc aussi nettement l'expérience côté client.

---

## 7. Modifications appliquées

| Fichier                                  | Changement                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `back/app/domain/connections.py`         | Ajout de `DEFAULT_MAX_CONNECTIONS = 1`, défaut de `compose_connected_journeys` (chemin de production). `MAX_CONNECTIONS = 2` conservé comme **plafond de capacité** du moteur. |
| `back/app/services/search.py`            | `_cache.set` protégé : un payload trop gros ne fait jamais échouer la requête (pas de 500).                                                                                    |
| `front/src/components/FiltersPanel.jsx`  | Option de filtre « 2 correspondances » retirée (Direct / 1 correspondance).                                                                                                    |
| `front/src/lib/tripTime.js`              | Défaut `maxConn` à 1 ; commentaire mis à jour.                                                                                                                                 |
| `front/src/pages/About.jsx`, `README.md` | Textes alignés sur « direct ou 1 correspondance ».                                                                                                                             |

**Tests** : `pytest` → 40/40 au vert.
Le plafond de capacité (2) étant conservé, les tests qui demandent explicitement 2 correspondances restent valides.

---

## 8. Suivi post-déploiement

Après le déploiement et un premier import, plusieurs vérifications doivent être menées dans les logs.
On s'assure **d'abord** de la _présence_ du message `Cache warmed: N origins, M stale entries pruned`, qui confirme que le cache s'est correctement rempli.
On vérifie **ensuite** l'_absence_ de toute erreur `DocumentTooLarge` ou `Cache warming failed after sync`, signe que plus aucun payload ne dépasse la limite.
**Enfin**, on contrôle qu'une recherche sur une grosse gare comme **Paris** ou **Lyon** répond _quasi instantanément_ une fois le cache rempli.

---

## 9. Alternatives écartées (ou différées)

Plusieurs autres pistes ont été examinées avant d'arrêter ce choix.
La **compression gzip du cache**, prise isolément, ferait _certes_ rentrer les données dans MongoDB (en ramenant l'ordre de grandeur de **1,6 Go à environ 150 Mo**), mais elle ne réduirait _ni_ le coût de calcul _ni_ la charge imposée au navigateur ; elle reste néanmoins **disponible comme optimisation complémentaire**, le stockage à une correspondance passant alors d'environ **391 Mo à une quarantaine de Mo**.
Un **plafond appliqué par destination** (un nombre de correspondances limité par ville) a aussi été envisagé, mais s'est révélé _inutile_ : se limiter à une correspondance suffit déjà à repasser sous les 16 Mo.
Enfin, l'option de ne conserver que les **trajets directs**, qui aurait ramené le plus gros payload à **1,7 Mo**, n'a été retenue qu'à titre de _dernier recours hypothétique_ ; elle n'a finalement pas été nécessaire, une correspondance passant _très largement_ sous la limite.

---

## 10. Réversibilité et évolutions futures

Le choix retenu est **entièrement réversible** : le moteur sait _toujours_ composer des parcours à deux correspondances, cette capacité ayant été conservée.
Repasser à deux correspondances ne demanderait que de modifier la constante `DEFAULT_MAX_CONNECTIONS` — étant entendu qu'il faudrait _alors_ traiter les payloads supérieurs à 16 Mo, par exemple via une compression et un plafonnement.

Si un tel besoin se présentait à l'avenir, plusieurs **pistes d'optimisation** pourraient être combinées.
La **compression gzip** du payload caché allègerait à la fois le stockage et le transfert réseau.
Une **réduction du coût de calcul**, obtenue en pré-calculant globalement les segments de correspondance plutôt qu'origine par origine, fiabiliserait le `warm_cache`.
Enfin, un **plafond par destination** permettrait de réintroduire des parcours plus profonds _sans pour autant_ regonfler les payloads.

---

## 11. Décision

La décision est de **limiter la production à une correspondance maximum** (soit deux trains).
Elle se justifie sur **trois plans**, tous appuyés par les mesures qui précèdent.

**Sur le plan technique**, c'est la _seule_ façon simple de garantir que **toutes** les réponses restent sous 16 Mo, et donc d'obtenir un cache qui se remplit intégralement et des recherches instantanées servies depuis ce cache, complété par la stratégie _stale-while-revalidate_.
À une correspondance, le plus gros payload tombe à **12,6 Mo** (Lyon) et _aucune_ origine ne dépasse la limite, là où deux correspondances en plaçaient **32** au-dessus du seuil.

**Sur le plan de la performance**, la limitation supprime l'extension à trois segments — _la partie de loin la plus coûteuse du calcul_ — et réduit fortement la charge de transfert et de rendu côté navigateur, le cache total étant ramené de **1,6 Go à 391 Mo**.

**Sur le plan produit**, enfin, le compromis est jugé _acceptable_ : un trajet à 0 € comportant deux correspondances suppose trois trains _tous_ éligibles à 0 € et deux correspondances qui s'enchaînent correctement, un cas à la fois **rare et peu praticable** dans les faits.

---

## 12. Reproduire les mesures

Toutes les mesures de ce rapport sont **reproductibles à l'identique**.
Depuis le dossier `back`, et après avoir renseigné les variables `MONGO_URL` et `DB_NAME` (cf. `.env`), il suffit de lancer le script de mesure : _sans argument_, il effectue un **scan complet** et affiche l'agrégat sur l'ensemble des origines ; _avec un ou plusieurs noms de gares_ en argument, il **détaille** le résultat origine par origine.

```bash
cd back
# nécessite MONGO_URL / DB_NAME (cf. .env)
.venv/bin/python scripts/measure_payloads.py            # scan complet (agrégat)
.venv/bin/python scripts/measure_payloads.py PARIS LYON # détail par origine
```

> Les valeurs absolues varient avec les imports SNCF (le nombre de trajets change chaque jour), mais le **rapport entre niveaux** (direct ≪ 1 corresp. ≪ 2 corresp.) et la conclusion restent stables.
