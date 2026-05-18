/** Date et heure courantes en Europe/Paris (heures SNCF). */
function parisTodayAndTime() {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const curTime = now.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { today, curTime };
}

/** True si le départ (date + heure locales France) est déjà passé. */
export function isDeparturePast(date, heureDepart) {
  const depTime = (heureDepart || "00:00").slice(0, 5);
  const { today, curTime } = parisTodayAndTime();
  if (date < today) return true;
  if (date > today) return false;
  return depTime < curTime;
}
