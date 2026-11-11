// localStorage helpers for MaxTracker.
// Toutes les lectures/écritures sont protégées : stockage indisponible (navigation
// privée, données de site bloquées…) = valeurs par défaut, jamais d'exception.

const KEYS = {
  favorites: "mt_favorites",
  hidden: "mt_hidden_destinations",
  welcomeDismissed: "mt_welcome_dismissed",
  filters: "mt_filters",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : préférence non mémorisée */
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function isWelcomeDismissed() {
  try {
    return localStorage.getItem(KEYS.welcomeDismissed) === "true";
  } catch {
    return false;
  }
}

export function setWelcomeDismissed() {
  try {
    localStorage.setItem(KEYS.welcomeDismissed, "true");
  } catch {
    /* ignore */
  }
}

export function getFavorites() {
  const list = readJson(KEYS.favorites, []);
  return Array.isArray(list) ? list : [];
}
export function setFavorites(list) {
  writeJson(KEYS.favorites, list);
}
export function toggleFavorite(station) {
  const list = getFavorites();
  const exists = list.find((s) => s.raw === station.raw);
  let next;
  if (exists) next = list.filter((s) => s.raw !== station.raw);
  else next = [station, ...list].slice(0, 8);
  setFavorites(next);
  return next;
}

export function getHidden() {
  const list = readJson(KEYS.hidden, []);
  return Array.isArray(list) ? list : [];
}
export function hideDestination(key) {
  const cur = new Set(getHidden());
  cur.add(key);
  writeJson(KEYS.hidden, [...cur]);
}
export function unhideDestination(key) {
  const cur = new Set(getHidden());
  cur.delete(key);
  writeJson(KEYS.hidden, [...cur]);
}
export function clearHidden() {
  remove(KEYS.hidden);
}


/** Derniers filtres utilisés (objet partiel, fusionné ensuite avec les valeurs par défaut). */
export function getSavedFilters() {
  const saved = readJson(KEYS.filters, null);
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : null;
}
export function saveFilters(filters) {
  writeJson(KEYS.filters, filters);
}
