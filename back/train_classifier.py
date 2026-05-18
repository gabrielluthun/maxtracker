"""Classification des trains à partir des champs Open Data SNCF (entity, axe, gares)."""
import re
import unicodedata
from typing import Optional

TER_ENTITIES = frozenset({"AZURPA", "PAAZUR", "PAVDR", "VDRPA"})

_COASTAL_RAW = (
    "NICE VILLE", "ANTIBES", "CANNES", "JUAN LES PINS", "MANDELIEU LA NAPOULE",
    "ST RAPHAEL VALESCURE", "FREJUS", "TOULON", "HYERES", "LA SEYNE SUR MER",
    "BANDOL", "SANARY SUR MER",
)

TGV_AXES_NORM = frozenset({
    "EST", "ATLANTIQUE", "NORD", "OUEST", "SUDEST", "INTERNATIONAL",
})


def normalize_station(name: str) -> str:
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    only_ascii = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", only_ascii.upper()).strip()


COASTAL_TER_STATIONS = frozenset(normalize_station(s) for s in _COASTAL_RAW)


def _has_tgv_station(name: str) -> bool:
    return "TGV" in (name or "").upper()


def _is_coastal_ter_od(origine: str, destination: str) -> bool:
    """Liaison TER courte entre deux gares côtières sans gare TGV dans le libellé."""
    if _has_tgv_station(origine) or _has_tgv_station(destination):
        return False
    o = normalize_station(origine)
    d = normalize_station(destination)
    return o in COASTAL_TER_STATIONS and d in COASTAL_TER_STATIONS


def _normalize_axe(axe: str) -> str:
    return (axe or "").upper().replace(" ", "").replace("-", "")


def classify_train_type(entity: str, axe: str, origine: str, destination: str) -> Optional[str]:
    """
    Retourne TGV_INOUI, INTERCITES, INTERCITES_NUIT, ou None si le trajet doit être exclu (TER, OUIGO…).
    """
    ent = (entity or "").upper()
    ax = (axe or "").strip().upper()

    if "OUIGO" in ent or "OUIGO" in ax:
        return None
    if ent in TER_ENTITIES:
        return None
    if _is_coastal_ter_od(origine, destination):
        return None

    if ax == "IC ARO":
        return "INTERCITES"
    if ax == "IC NUIT":
        return "INTERCITES_NUIT"
    if _normalize_axe(axe) in TGV_AXES_NORM:
        return "TGV_INOUI"
    if ax:
        return "TGV_INOUI"
    return "INTERCITES"


def is_eligible_subscription_train(entity: str, axe: str, origine: str, destination: str) -> bool:
    return classify_train_type(entity, axe, origine, destination) is not None
