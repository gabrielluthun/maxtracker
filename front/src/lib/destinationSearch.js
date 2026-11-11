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

/** Vrai si la ville ou l'une de ses gares contient le texte saisi. */
export function groupMatchesDestination(group, query) {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return [group.destination_city, ...(group.destinations || [])].some((name) =>
    normalizeSearchText(name).includes(q)
  );
}

export function filterGroupsByDestination(groups, query) {
  if (!normalizeSearchText(query)) return groups;
  return groups.filter((g) => groupMatchesDestination(g, query));
}
