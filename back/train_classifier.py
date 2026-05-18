"""Classification des trains à partir des champs Open Data SNCF (entity, axe, gares)."""
import re
import unicodedata
from typing import Optional

# Opérateurs / entités exclusivement TER dans le jeu de données SNCF.
TER_ENTITIES = frozenset({"AZURPA", "PAAZUR", "PAVDR", "VDRPA"})

# Numéros de train qui n'apparaissent qu'avec des entités TER (données OUI SNCF).
TER_EXCLUSIVE_TRAIN_NUMBERS = frozenset({
    "32950", "6106", "6124", "6153", "6155", "6163", "6165", "6168", "6170",
    "6173", "6174", "6175", "6176", "6177", "6180", "6181", "6186", "6187",
    "6188", "6191", "6193", "6194", "6195", "6196", "6198",
})

# Entités « correspondance » : un train peut inclure des tronçons TGV et des tronçons TER.
CORRESPONDANCE_ENTITIES = frozenset({
    "JCPROVSUD", "JCSUDPROV", "JCSUDATL", "JCATLSUD", "JCNORDSUD", "JCBRETNORD", "JCRHINRHON",
})

TGV_AXES_NORM = frozenset({
    "EST", "ATLANTIQUE", "NORD", "OUEST", "SUDEST", "INTERNATIONAL",
})


def normalize_station(name: str) -> str:
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    only_ascii = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", only_ascii.upper()).strip()


def _has_tgv_station(name: str) -> bool:
    return "TGV" in (name or "").upper()


def _normalize_axe(axe: str) -> str:
    return (axe or "").upper().replace(" ", "").replace("-", "")


def _is_ter_train(entity: str, train_no: str, origine: str, destination: str) -> bool:
    """Détecte un train TER (régional), y compris les tronçons de correspondance."""
    ent = (entity or "").upper()
    if ent in TER_ENTITIES:
        return True
    if (train_no or "") in TER_EXCLUSIVE_TRAIN_NUMBERS:
        return True
    if ent in CORRESPONDANCE_ENTITIES:
        if not _has_tgv_station(origine) and not _has_tgv_station(destination):
            return True
    return False


def classify_train_type(
    entity: str, axe: str, origine: str, destination: str, train_no: str = ""
) -> Optional[str]:
    """
    Retourne TGV_INOUI, INTERCITES, INTERCITES_NUIT, ou None (TER / hors abonnement).
    Les OUIGO sont regroupés sous TGV_INOUI.
    """
    ent = (entity or "").upper()
    ax = (axe or "").strip().upper()

    if _is_ter_train(ent, train_no, origine, destination):
        return None

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


def is_eligible_subscription_train(
    entity: str, axe: str, origine: str, destination: str, train_no: str = ""
) -> bool:
    return classify_train_type(entity, axe, origine, destination, train_no) is not None
