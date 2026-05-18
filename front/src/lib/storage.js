// localStorage helpers for MaxTracker

const KEYS = {
  favorites: "mt_favorites",
  hidden: "mt_hidden_destinations",
  welcomeDismissed: "mt_welcome_dismissed",
};

export function isWelcomeDismissed() {
  try {
    return localStorage.getItem(KEYS.welcomeDismissed) === "true";
  } catch {
    return false;
  }
}

export function setWelcomeDismissed() {
  localStorage.setItem(KEYS.welcomeDismissed, "true");
}

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(KEYS.favorites)) || []; } catch { return []; }
}
export function setFavorites(list) {
  localStorage.setItem(KEYS.favorites, JSON.stringify(list));
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
  try { return JSON.parse(localStorage.getItem(KEYS.hidden)) || []; } catch { return []; }
}
export function hideDestination(key) {
  const cur = new Set(getHidden());
  cur.add(key);
  localStorage.setItem(KEYS.hidden, JSON.stringify([...cur]));
}
export function unhideDestination(key) {
  const cur = new Set(getHidden());
  cur.delete(key);
  localStorage.setItem(KEYS.hidden, JSON.stringify([...cur]));
}