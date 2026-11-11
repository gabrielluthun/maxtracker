// Recherche d'une destination dans les résultats (« Où voulez-vous aller ? »).

/** Minuscules, sans accents ni tirets ; « saint » / « sainte » ramenés à « st » / « ste » (noms SNCF). */
export function normalizeSearchText(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-'’()/.]/g, " ")
    .replace(/\bsainte\b/g, "ste")
    .replace(/\bsaint\b/g, "st")
    .replace(/\s+/g, " ")
    .trim();
}

// Noms normalisés par groupe (ville, noms SNCF et vrais noms de gare), calculés une fois.
const searchableNamesCache = new WeakMap();

/**
 * Noms qui identifient le groupe : la ville, les gares SNCF (« LYON (intramuros) »)
 * et les vrais noms d'arrivée des trajets (« Lyon Part-Dieu », « Lyon Perrache »).
 */
function searchableNames(group) {
  let names = searchableNamesCache.get(group);
  if (!names) {
    const raw = new Set([group.destination_city, ...(group.destinations || [])]);
    for (const trip of group.trips || []) raw.add(trip.destination_label);
    for (const journey of group.connected_trips || []) {
      const legs = journey.legs || [];
      raw.add(legs[legs.length - 1]?.destination_label);
    }
    names = [...raw].filter(Boolean).map(normalizeSearchText);
    searchableNamesCache.set(group, names);
  }
  return names;
}

/** Vrai si la ville ou l'une de ses gares contient le texte saisi. */
export function groupMatchesDestination(group, query) {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return searchableNames(group).some((name) => name.includes(q));
}

export function filterGroupsByDestination(groups, query) {
  if (!normalizeSearchText(query)) return groups;
  return groups.filter((g) => groupMatchesDestination(g, query));
}
