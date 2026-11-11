// État de la recherche dans l'URL : lien partageable, favori, bouton « Précédent ».
// Format court, en français, et seules les valeurs différentes du défaut :
//   ?gare=Paris&dest=bordeaux&vue=calendrier&corresp=1&horizon=7&duree=180
//    &aujourdhui=1&weekend=1&creneaux=matin,soir&trains=inoui,ic&jour=2026-11-12
import {
  DATE_HORIZON_OPTIONS,
  DEFAULT_DATE_HORIZON_DAYS,
  MAX_DURATION_OPTIONS,
} from "@/lib/tripTime";

export const DEFAULT_FILTERS = Object.freeze({
  departureTodayOnly: false,
  weekendOnly: false,
  newOnly: false, // trajets apparus dans les dernières 24 h de publications SNCF
  timeSlots: Object.freeze({ morning: true, afternoon: true, evening: true }),
  showInoui: true,
  showIntercites: true,
  showIntercitesNuit: true,
  maxConnections: 0,
  maxDurationMinutes: null,
  dateHorizonDays: DEFAULT_DATE_HORIZON_DAYS,
  selectedDate: null, // jour choisi dans le calendrier (YYYY-MM-DD)
});

const SLOTS = [["matin", "morning"], ["aprem", "afternoon"], ["soir", "evening"]];
const TRAINS = [["inoui", "showInoui"], ["ic", "showIntercites"], ["nuit", "showIntercitesNuit"]];
const VIEWS = [["liste", "list"], ["calendrier", "calendar"], ["pics", "chart"]];
const HORIZONS = DATE_HORIZON_OPTIONS.map((o) => o.value);
const DURATIONS = MAX_DURATION_OPTIONS.map((o) => o.value).filter((v) => v != null);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Copie modifiable des filtres par défaut, complétée par `partial` (champs connus uniquement). */
export function filtersWithDefaults(partial = {}) {
  const out = { ...DEFAULT_FILTERS, timeSlots: { ...DEFAULT_FILTERS.timeSlots } };
  if (!partial || typeof partial !== "object") return out;
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    if (!(key in partial)) continue;
    out[key] = key === "timeSlots" ? { ...out.timeSlots, ...partial.timeSlots } : partial[key];
  }
  return out;
}

function titleCase(text) {
  return text
    .toLowerCase()
    .replace(/(^|[^a-zà-öø-ÿ])([a-zà-öø-ÿ])/g, (_, before, letter) => before + letter.toUpperCase());
}

/**
 * Gare à partir de sa valeur brute. Les métropoles arrivent en casse normale
 * (« Paris ») depuis l'API, les gares SNCF en majuscules (« LYON PART DIEU »).
 */
export function stationFromRaw(raw) {
  const isMetropolis = raw !== raw.toUpperCase();
  return {
    raw,
    is_metropolis: isMetropolis,
    name: isMetropolis ? `${raw} (toutes gares)` : titleCase(raw),
  };
}

export function parseSearchState(search) {
  const params = new URLSearchParams(search);
  const raw = (params.get("gare") || "").trim();
  const filters = filtersWithDefaults();

  if (params.get("corresp") === "1") filters.maxConnections = 1;
  const horizon = Number(params.get("horizon"));
  if (HORIZONS.includes(horizon)) filters.dateHorizonDays = horizon;
  const duration = Number(params.get("duree"));
  if (DURATIONS.includes(duration)) filters.maxDurationMinutes = duration;
  if (params.get("aujourdhui") === "1") filters.departureTodayOnly = true;
  if (params.get("nouveau") === "1") filters.newOnly = true;
  if (params.get("weekend") === "1") filters.weekendOnly = true;
  if (params.has("creneaux")) {
    const chosen = new Set(params.get("creneaux").split(","));
    for (const [name, key] of SLOTS) filters.timeSlots[key] = chosen.has(name);
  }
  if (params.has("trains")) {
    const chosen = new Set(params.get("trains").split(","));
    for (const [name, key] of TRAINS) filters[key] = chosen.has(name);
  }
  const day = params.get("jour");
  if (day && ISO_DATE.test(day)) filters.selectedDate = day;

  const view = VIEWS.find(([name]) => name === params.get("vue"));
  return {
    station: raw ? stationFromRaw(raw) : null,
    filters,
    destQuery: params.get("dest") || "",
    tab: view ? view[1] : "list",
  };
}

/** Chaîne de requête (« ?… » ou « ») ; sans gare, l'URL reste nue. */
export function serializeSearchState({ station, filters, destQuery = "", tab = "list" }) {
  if (!station?.raw) return "";
  const f = filtersWithDefaults(filters);
  const params = new URLSearchParams();
  params.set("gare", station.raw);
  if (destQuery.trim()) params.set("dest", destQuery.trim());
  const view = VIEWS.find(([, value]) => value === tab);
  if (view && view[1] !== "list") params.set("vue", view[0]);
  if (f.maxConnections > 0) params.set("corresp", "1");
  if (f.dateHorizonDays !== DEFAULT_DATE_HORIZON_DAYS) params.set("horizon", String(f.dateHorizonDays));
  if (f.maxDurationMinutes != null) params.set("duree", String(f.maxDurationMinutes));
  if (f.departureTodayOnly) params.set("aujourdhui", "1");
  if (f.newOnly) params.set("nouveau", "1");
  if (f.weekendOnly) params.set("weekend", "1");
  if (SLOTS.some(([, key]) => !f.timeSlots[key])) {
    params.set("creneaux", SLOTS.filter(([, key]) => f.timeSlots[key]).map(([name]) => name).join(","));
  }
  if (TRAINS.some(([, key]) => !f[key])) {
    params.set("trains", TRAINS.filter(([, key]) => f[key]).map(([name]) => name).join(","));
  }
  if (f.selectedDate) params.set("jour", f.selectedDate);
  return `?${params}`;
}

/** Filtres à mémoriser entre deux visites (le jour choisi est ponctuel). */
export function filtersToRemember(filters) {
  return { ...filters, selectedDate: null };
}
