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

function enrichTripTiming(trip, clock) {
  const h = parseInt((trip.heure_depart || "0").slice(0, 2), 10);
  const day = new Date(`${trip.date}T12:00:00`).getDay();
  return {
    ...trip,
    _past: isDeparturePast(trip.date, trip.heure_depart, clock),
    _today: trip.date === clock.today,
    _weekend: day === 0 || day === 6,
    _slot: h < 12 ? "morning" : h < 18 ? "afternoon" : "evening",
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
  };
}

/** True si le groupe contient au moins un départ non passé aujourd'hui (trajets déjà filtrés). */
export function groupHasDepartureToday(trips, connectedTrips = []) {
  return trips.some((t) => t._today) || connectedTrips.some((c) => c._today);
}

function matchesCommonFilters(item, filters) {
  if (item._past) return false;
  if (filters.departureTodayOnly && !item._today) return false;
  if (filters.weekendOnly && !item._weekend) return false;
  if (!filters.timeSlots[item._slot]) return false;
  return true;
}

function legMatchesTrainFilters(leg, filters) {
  if (leg.train_type === "TGV_INOUI" && !filters.showInoui) return false;
  if (leg.train_type === "INTERCITES" && !filters.showIntercites) return false;
  if (leg.train_type === "INTERCITES_NUIT" && !filters.showIntercitesNuit) return false;
  if (leg.fare_eur != null && leg.fare_eur > 0) return false;
  return true;
}

export function tripMatchesFilters(t, filters) {
  if (!matchesCommonFilters(t, filters)) return false;
  return legMatchesTrainFilters(t, filters);
}

/** Parcours avec correspondance ; filtré selon maxConnections (0–2). */
export function connectedTripMatchesFilters(ct, filters) {
  const maxConn = filters.maxConnections ?? 2;
  const count = (ct.legs?.length ?? 1) - 1;
  if (count > maxConn) return false;
  if (!matchesCommonFilters(ct, filters)) return false;
  const legs = ct.legs || [];
  if (legs.length === 0) return false;
  return legs.every((leg) => legMatchesTrainFilters(leg, filters));
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
