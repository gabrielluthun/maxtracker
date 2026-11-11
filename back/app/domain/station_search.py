"""Recherche de gares de départ à partir de ce que tape l'utilisateur.

Le flux SNCF nomme les gares à sa façon : majuscules sans tirets, « SAINT »
ou « ST » selon les gares (« SAINT ETIENNE CHATEAUCREUX », « ST MALO »), et
certaines grandes gares regroupées (« PARIS (intramuros) » pour Gare de Lyon,
Montparnasse, Nord…). On compare donc des formes normalisées, mot par mot, et
on cherche aussi dans les vrais noms de gare (déduits des codes transporteur)
pour retrouver « Montparnasse » ou « Part-Dieu ».

Ordre des résultats, du plus au moins pertinent :
  0. le nom commence par la saisie (« lyon » → LYON (intramuros)) ;
  1. un nom de gare regroupée commence par la saisie (« Lille Europe ») ;
  2. chaque mot saisi commence un mot du nom (« pierre corps », « roissy ») ;
  3. idem dans un nom de gare regroupée (« montparnasse », « gare du nord »).
Dès qu'un résultat de rang 0 ou 1 existe, les rangs 2 et 3 sont écartés :
« lyon » ne doit pas proposer Paris au titre de « Paris Gare de Lyon ».
"""
from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, Iterable, Optional

_NON_ALNUM = re.compile(r"[^A-Z0-9]+")
_SHORT = {"SAINT": "ST", "SAINTE": "STE"}
_LONG = {"ST": "SAINT", "STE": "SAINTE"}


def _base_key(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    return _NON_ALNUM.sub(" ", ascii_only.upper()).strip()


def search_forms(text: str) -> tuple[str, str]:
    """Deux formes comparables : « ST » abrégé, et « SAINT » en toutes lettres.

    La seconde permet de trouver une gare dès « Sain… » avant la fin du mot.
    """
    words = _base_key(text).split()
    return (
        " ".join(_SHORT.get(w, w) for w in words),
        " ".join(_LONG.get(w, w) for w in words),
    )


@dataclass(frozen=True)
class StationEntry:
    raw: str  # nom de la gare dans le flux SNCF (valeur de recherche)
    name_forms: tuple[str, str]
    aliases: tuple[str, ...]  # vrais noms des gares regroupées sous `raw`
    alias_forms: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class StationMatch:
    raw: str
    rank: int
    alias: Optional[str] = None  # nom de gare regroupée qui a permis de la trouver


def build_station_index(
    rows: Iterable[dict],
    *,
    label: Callable[[str, Optional[str]], str],
) -> list[StationEntry]:
    """Index à partir des couples {origine, iata} présents dans les trajets.

    `label(origine, code)` donne le nom affiché de la gare correspondant à un
    code transporteur ; il ne devient un alias que s'il diffère du nom SNCF.
    """
    labels: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        raw = (row.get("origine") or "").strip()
        if not raw:
            continue
        names = labels[raw]  # crée l'entrée même si la gare n'a pas de nom affiché
        name = label(raw, row.get("iata"))
        if name:
            names.add(name)
    entries = []
    for raw, names in labels.items():
        name_forms = search_forms(raw)
        aliases = tuple(sorted(n for n in names if search_forms(n)[0] != name_forms[0]))
        entries.append(
            StationEntry(
                raw=raw,
                name_forms=name_forms,
                aliases=aliases,
                alias_forms=tuple(search_forms(a) for a in aliases),
            )
        )
    return sorted(entries, key=lambda e: e.raw)


def _starts_with(forms: tuple[str, str], query: tuple[str, str]) -> bool:
    return forms[0].startswith(query[0]) or forms[1].startswith(query[1])


def _every_word_found(forms: tuple[str, str], query: tuple[str, str]) -> bool:
    for form, q in zip(forms, query):
        words = form.split()
        if all(any(w.startswith(token) for w in words) for token in q.split()):
            return True
    return False


def _match(entry: StationEntry, query: tuple[str, str]) -> Optional[StationMatch]:
    if _starts_with(entry.name_forms, query):
        return StationMatch(entry.raw, 0)
    for alias, forms in zip(entry.aliases, entry.alias_forms):
        if _starts_with(forms, query):
            return StationMatch(entry.raw, 1, alias)
    if _every_word_found(entry.name_forms, query):
        return StationMatch(entry.raw, 2)
    for alias, forms in zip(entry.aliases, entry.alias_forms):
        if _every_word_found(forms, query):
            return StationMatch(entry.raw, 3, alias)
    return None


def find_stations(query: str, entries: Iterable[StationEntry]) -> list[StationMatch]:
    forms = search_forms(query)
    if not forms[0]:
        return []
    matches = [m for m in (_match(e, forms) for e in entries) if m is not None]
    if any(m.rank <= 1 for m in matches):
        matches = [m for m in matches if m.rank <= 1]
    return sorted(matches, key=lambda m: (m.rank, m.raw))
