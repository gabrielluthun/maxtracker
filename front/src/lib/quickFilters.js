// Raccourcis de filtres (mobile) : un appui active ou coupe un filtre courant.
import { DEFAULT_DATE_HORIZON_DAYS } from "@/lib/tripTime";

const SHORT_TRIP_MINUTES = 180;

export const QUICK_FILTERS = [
  { key: "today", label: "Aujourd’hui" },
  { key: "weekend", label: "Week-end" },
  { key: "new", label: "Nouveautés" },
  { key: "short", label: "≤ 3 h" },
];

const BOOLEAN_KEYS = { today: "departureTodayOnly", weekend: "weekendOnly", new: "newOnly" };

export function isQuickFilterOn(filters, key) {
  if (key === "short") return filters.maxDurationMinutes === SHORT_TRIP_MINUTES;
  return !!filters[BOOLEAN_KEYS[key]];
}

/** Bascule un raccourci ; Aujourd'hui et Week-end s'excluent (activer l'un coupe l'autre). */
export function toggleQuickFilter(filters, key) {
  const on = !isQuickFilterOn(filters, key);
  if (key === "short") return { ...filters, maxDurationMinutes: on ? SHORT_TRIP_MINUTES : null };
  const next = { ...filters, [BOOLEAN_KEYS[key]]: on };
  if (on && key === "today") next.weekendOnly = false;
  if (on && key === "weekend") next.departureTodayOnly = false;
  return next;
}

/** Filtres différents du défaut (pastille du bouton Filtres) ; le jour choisi a sa propre pastille. */
export function activeFilterCount(filters) {
  const slots = filters.timeSlots || {};
  return [
    filters.departureTodayOnly,
    filters.weekendOnly,
    filters.newOnly,
    filters.maxConnections > 0,
    filters.maxDurationMinutes != null,
    (filters.dateHorizonDays ?? DEFAULT_DATE_HORIZON_DAYS) !== DEFAULT_DATE_HORIZON_DAYS,
    !slots.morning || !slots.afternoon || !slots.evening,
    !filters.showInoui || !filters.showIntercites || !filters.showIntercitesNuit,
  ].filter(Boolean).length;
}
