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

/** Prépare les trajets une fois (horloge Paris, week-end, créneau) — pas à refaire à chaque filtre. */
export function enrichSearchGroups(groups) {
  if (!groups?.length) return [];
  const clock = getParisClock();
  return groups.map((g) => ({
    ...g,
    trips: g.trips.map((t) => {
      const h = parseInt((t.heure_depart || "0").slice(0, 2), 10);
      const day = new Date(`${t.date}T12:00:00`).getDay();
      return {
        ...t,
        _past: isDeparturePast(t.date, t.heure_depart, clock),
        _weekend: day === 0 || day === 6,
        _slot: h < 12 ? "morning" : h < 18 ? "afternoon" : "evening",
      };
    }),
  }));
}

export function tripMatchesFilters(t, filters) {
  if (t._past) return false;
  if (filters.weekendOnly && !t._weekend) return false;
  if (!filters.timeSlots[t._slot]) return false;
  if (t.train_type === "TGV_INOUI" && !filters.showInoui) return false;
  if (t.train_type === "INTERCITES" && !filters.showIntercites) return false;
  if (t.train_type === "INTERCITES_NUIT" && !filters.showIntercitesNuit) return false;
  if (t.fare_eur != null && t.fare_eur > 0) return false;
  return true;
}

export function tripsArrayEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
