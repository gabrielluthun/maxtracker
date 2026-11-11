// Lien de réservation SNCF Connect — même règle que back/app/services/sncf/connect.py.
// Construit côté client pour ne pas transférer une URL par trajet (réponses `compact`).

export const SNCF_CONNECT_BASE = "https://www.sncf-connect.com";

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function timeParts(heureDepart) {
  const timePart = (heureDepart || "00:00").trim().slice(0, 5);
  const [hours, minutes = "00"] = timePart.split(":");
  return { timePart, hours, minutes };
}

/** « 2026-06-20 » → « 20 juin 2026 » (texte libre de la recherche SNCF Connect). */
function formatFrenchSearchDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, y, m, d] = match;
  const month = MONTHS_FR[Number(m) - 1];
  if (!month) return isoDate;
  return `${Number(d)} ${month} ${y}`;
}

/** Format attendu par /redirect : YYYY-MM-DD-HH-MM. */
function formatOutwardDate(date, heureDepart) {
  const { hours, minutes } = timeParts(heureDepart);
  const pad = (v) => String(Number.parseInt(v, 10) || 0).padStart(2, "0");
  return `${date}-${pad(hours)}-${pad(minutes)}`;
}

export function buildSncfConnectUrl(
  { origine_iata, destination_iata, date, heure_depart, origine, destination },
  base = SNCF_CONNECT_BASE
) {
  const originCode = (origine_iata || "").trim();
  const destCode = (destination_iata || "").trim();
  const { timePart, hours, minutes } = timeParts(heure_depart);

  if (originCode && destCode) {
    const params = new URLSearchParams({
      nb_pax: "1",
      origin_transporter_code: originCode,
      destination_transporter_code: destCode,
      redirection_type: "SEARCH",
      branch: "SHOP",
    });
    if (date) params.set("outward_date", formatOutwardDate(date, timePart));
    return `${base}/redirect?${params}`;
  }

  const parts = [(origine || "").trim(), (destination || "").trim()];
  if (date) parts.push(`le ${formatFrenchSearchDate(date)}`);
  if (timePart) parts.push(`à ${hours}h${minutes}`);
  const q = parts.filter(Boolean).join(" ");
  return `${base}/app/home/search?${new URLSearchParams({ q })}`;
}

/** Lien du serveur s'il est fourni (réponse complète), sinon construit localement. */
export function tripConnectUrl(trip) {
  return trip.sncf_connect_url || buildSncfConnectUrl(trip);
}
