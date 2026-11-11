import axios from "axios";

const BACKEND_URL =
  import.meta.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 120000 });

export async function searchStations(q, { signal } = {}) {
  if (!q || q.length < 3) return [];
  const { data } = await api.get(`/stations/search`, { params: { q }, signal });
  return data || [];
}

/**
 * Trajets au départ d'une gare.
 * - `connections: false` (défaut) : directs seuls, ~6× plus léger ;
 * - `compact: 1` : sans les champs recalculés côté client (lien SNCF Connect, ids…).
 */
export async function searchTrips(origin, { connections = false } = {}) {
  const { data } = await api.get(`/search`, {
    params: { origin, connections: connections ? 1 : 0, compact: 1 },
  });
  return data;
}

export async function getSyncInfo() {
  const { data } = await api.get(`/sync/info`);
  return data;
}

export async function triggerSync() {
  const { data } = await api.post(`/sync/trigger`);
  return data;
}
