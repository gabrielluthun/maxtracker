/** null = pas de limite */
export const MAX_DURATION_OPTIONS = [
  { value: null, label: "Tous", testId: "filter-duration-all" },
  { value: 180, label: "≤ 3 h", testId: "filter-duration-180" },
  { value: 300, label: "≤ 5 h", testId: "filter-duration-300" },
  { value: 480, label: "≤ 8 h", testId: "filter-duration-480" },
];

export const DEFAULT_DATE_HORIZON_DAYS = 30;

/** N = aujourd'hui + N−1 jours calendaires (Paris). */
export const DATE_HORIZON_OPTIONS = [
  { value: 7, label: "7 j", testId: "filter-horizon-7" },
  { value: 14, label: "14 j", testId: "filter-horizon-14" },
  { value: 30, label: "30 j", testId: "filter-horizon-30" },
];

/** Date et heure courantes en Europe/Paris (heures SNCF). */
export function getParisClock() {
  const now = new Date();
  return {
    today: now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }),
    curTime: now.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}


export function formatTripDayLabel(date) {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Regroupe des trajets triés par date en sections { date, trips }. */
export function groupTripsByDate(trips) {
  const sections = [];
  for (const trip of trips) {
    const last = sections[sections.length - 1];
    if (last?.date === trip.date) last.trips.push(trip);
    else sections.push({ date: trip.date, trips: [trip] });
  }
  return sections;
}

/** True si le départ (date + heure locales France) est déjà passé. */
export function isDeparturePast(date, heureDepart, clock = getParisClock()) {
  const depTime = (heureDepart || "00:00").slice(0, 5);
  if (date < clock.today) return true;
  if (date > clock.today) return false;
  return depTime < clock.curTime;
}

/** Ajoute des jours calendaires à une date ISO (YYYY-MM-DD), ancrage midi UTC. */
export function addCalendarDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

/** Dernière date incluse pour un horizon de N jours à partir de `fromDate`. */
export function horizonLastDate(fromDate, horizonDays) {
  if (horizonDays == null) return null;
  return addCalendarDays(fromDate, horizonDays - 1);
}

function parseMinutesHHmm(value) {
  const [h, m] = (value || "00:00").slice(0, 5).split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

/** Durée en minutes entre départ et arrivée (trains de nuit : +24 h si arrivée < départ). */
export function tripDurationMinutes(heureDepart, heureArrivee) {
  const dep = parseMinutesHHmm(heureDepart);
  const arr = parseMinutesHHmm(heureArrivee);
  let mins = arr - dep;
  if (mins < 0) mins += 24 * 60;
  return mins;
}

function enrichTripTiming(trip, clock) {
  const h = parseInt((trip.heure_depart || "0").slice(0, 2), 10);
  const day = new Date(`${trip.date}T12:00:00`).getDay();
  return {
    ...trip,
    _past: isDeparturePast(trip.date, trip.heure_depart, clock),
    _today: trip.date === clock.today,
    _weekend: day === 0 || day === 6,
    _slot: h < 12 ? "morning" : h < 18 ? "afternoon" : "evening",
    _durationMinutes: tripDurationMinutes(trip.heure_depart, trip.heure_arrivee),
  };
}

/** Prépare les trajets une fois (horloge Paris, week-end, créneau) — pas à refaire à chaque filtre. */
export function enrichSearchGroups(groups) {
  if (!groups?.length) return [];
  const clock = getParisClock();
  return groups.map((g) => ({
    ...g,
    trips: (g.trips || []).map((t) => enrichTripTiming(t, clock)),
    connected_trips: (g.connected_trips || []).map((ct) => enrichConnectedTrip(ct, clock)),
  }));
}

function enrichConnectedTrip(ct, clock) {
  const h = parseInt((ct.heure_depart || "0").slice(0, 2), 10);
  const day = new Date(`${ct.date}T12:00:00`).getDay();
  return {
    ...ct,
    legs: (ct.legs || []).map((leg) => enrichTripTiming(leg, clock)),
    _past: isDeparturePast(ct.date, ct.heure_depart, clock),
    _today: ct.date === clock.today,
    _weekend: day === 0 || day === 6,
    _slot: h < 12 ? "morning" : h < 18 ? "afternoon" : "evening",
    _durationMinutes:
      ct.total_duration_minutes > 0
        ? ct.total_duration_minutes
        : tripDurationMinutes(ct.heure_depart, ct.heure_arrivee),
  };
}

/** True si le groupe contient au moins un départ non passé aujourd'hui (trajets déjà filtrés). */
export function groupHasDepartureToday(trips, connectedTrips = []) {
  return trips.some((t) => t._today) || connectedTrips.some((c) => c._today);
}

/** Contexte pré-calculé (une horloge Paris, une borne d'horizon) pour filtrer en masse. */
export function createFilterContext(filters) {
  const { today } = getParisClock();
  return {
    filters,
    today,
    horizonLast: horizonLastDate(
      today,
      filters.dateHorizonDays ?? DEFAULT_DATE_HORIZON_DAYS
    ),
    maxConn: filters.maxConnections ?? 2,
    maxDuration: filters.maxDurationMinutes ?? null,
    allTrainTypes:
      filters.showInoui && filters.showIntercites && filters.showIntercitesNuit,
  };
}

function matchesCommonFiltersCtx(item, ctx) {
  const { filters, today, horizonLast, maxDuration } = ctx;
  if (item._past) return false;
  if (horizonLast != null && (item.date < today || item.date > horizonLast)) return false;
  if (filters.departureTodayOnly && !item._today) return false;
  if (filters.weekendOnly && !item._weekend) return false;
  if (!filters.timeSlots[item._slot]) return false;
  if (maxDuration != null && item._durationMinutes != null && item._durationMinutes > maxDuration) {
    return false;
  }
  return true;
}

function legMatchesTrainFiltersCtx(leg, ctx) {
  if (leg.fare_eur != null && leg.fare_eur > 0) return false;
  if (ctx.allTrainTypes) return true;
  const { filters } = ctx;
  if (leg.train_type === "TGV_INOUI" && !filters.showInoui) return false;
  if (leg.train_type === "INTERCITES" && !filters.showIntercites) return false;
  if (leg.train_type === "INTERCITES_NUIT" && !filters.showIntercitesNuit) return false;
  return true;
}

function tripMatchesFiltersCtx(t, ctx) {
  if (!matchesCommonFiltersCtx(t, ctx)) return false;
  return legMatchesTrainFiltersCtx(t, ctx);
}

function connectedTripMatchesFiltersCtx(ct, ctx) {
  const count = (ct.legs?.length ?? 1) - 1;
  if (count > ctx.maxConn) return false;
  if (!matchesCommonFiltersCtx(ct, ctx)) return false;
  const legs = ct.legs || [];
  if (legs.length === 0) return false;
  return legs.every((leg) => legMatchesTrainFiltersCtx(leg, ctx));
}

export function tripMatchesFilters(t, filters) {
  return tripMatchesFiltersCtx(t, createFilterContext(filters));
}

/** Parcours avec correspondance ; filtré selon maxConnections (0–2). */
export function connectedTripMatchesFilters(ct, filters) {
  return connectedTripMatchesFiltersCtx(ct, createFilterContext(filters));
}

/**
 * Filtre tous les groupes en une passe ; réutilise les entrées inchangées via `prevCache`.
 */
export function filterPreparedGroups(preparedGroups, filters, hidden, prevCache = new Map()) {
  if (!preparedGroups?.length) {
    return { groups: [], totalTrips: 0, cache: new Map() };
  }
  const ctx = createFilterContext(filters);
  const hiddenSet = hidden instanceof Set ? hidden : new Set(hidden);
  const nextCache = new Map();
  const out = [];
  let totalTrips = 0;

  for (const g of preparedGroups) {
    if (hiddenSet.has(g.destination_city)) continue;

    const trips = [];
    for (const t of g.trips) {
      if (tripMatchesFiltersCtx(t, ctx)) trips.push(t);
    }

    const connected_trips = [];
    for (const ct of g.connected_trips || []) {
      if (connectedTripMatchesFiltersCtx(ct, ctx)) connected_trips.push(ct);
    }

    if (trips.length === 0 && connected_trips.length === 0) continue;

    totalTrips += trips.length + connected_trips.length;
    const key = g.destination_city;
    const prev = prevCache.get(key);
    const entry = {
      ...g,
      trips,
      connected_trips,
      trip_count: trips.length + connected_trips.length,
    };

    if (prev && destinationGroupResultsEqual(prev, entry)) {
      nextCache.set(key, prev);
      out.push(prev);
    } else {
      nextCache.set(key, entry);
      out.push(entry);
    }
  }

  return { groups: out, totalTrips, cache: nextCache };
}

/** Regroupe directs et correspondances par date, triés par heure de départ. */
export function groupDestinationItemsByDate(trips, connectedTrips = []) {
  const items = [
    ...trips.map((trip) => ({
      kind: "direct",
      trip,
      date: trip.date,
      sortKey: trip.departure_datetime || `${trip.date}T${trip.heure_depart}`,
    })),
    ...connectedTrips.map((connected) => ({
      kind: "connected",
      connected,
      date: connected.date,
      sortKey: connected.departure_datetime || `${connected.date}T${connected.heure_depart}`,
    })),
  ].sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));

  const sections = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last?.date === item.date) last.items.push(item);
    else sections.push({ date: item.date, items: [item] });
  }
  return sections;
}

export function tripsArrayEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function destinationGroupResultsEqual(prev, next) {
  return (
    tripsArrayEqual(prev.trips, next.trips) &&
    tripsArrayEqual(prev.connected_trips || [], next.connected_trips || [])
  );
}
