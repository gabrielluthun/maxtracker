"""Type de train (pour l'affichage et les filtres) à partir des champs Open Data SNCF.

Le jeu « Disponibilités TGV Max » ne contient que des trains couverts par
l'abonnement (TGV INOUI, Intercités, Intercités de nuit) : l'éligibilité est
donnée par `od_happy_card = "OUI"`, jamais devinée ici. Aucun trajet n'est
écarté sur son type — une ancienne règle « TER » masquait à tort des TGV
(intersecteurs comme Lille → Lyon, TGV Paris ↔ Côte d'Azur sur Nice → Cannes).
"""

TGV_AXES_NORM = frozenset({
    "EST", "ATLANTIQUE", "NORD", "OUEST", "SUDEST", "INTERNATIONAL",
})


def _normalize_axe(axe: str) -> str:
    return (axe or "").upper().replace(" ", "").replace("-", "")


def classify_train_type(entity: str, axe: str) -> str:
    """TGV_INOUI, INTERCITES ou INTERCITES_NUIT."""
    ent = (entity or "").upper()
    ax = (axe or "").strip().upper()

    if "OUIGO" in ent or "OUIGO" in ax:
        return "TGV_INOUI"
    if ax == "IC ARO":
        return "INTERCITES"
    if ax == "IC NUIT":
        return "INTERCITES_NUIT"
    if _normalize_axe(axe) in TGV_AXES_NORM:
        return "TGV_INOUI"
    if ax:
        return "TGV_INOUI"
    return "INTERCITES"
