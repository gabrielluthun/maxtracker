import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchTrips } from "@/lib/api";

export const SEARCH_STALE_MS = 5 * 60_000;
export const SEARCH_GC_MS = 30 * 60_000;

export function searchQueryKey(originRaw, connections = false) {
  return ["search", originRaw, connections ? "with-connections" : "direct"];
}

/** Les correspondances ne sont téléchargées que si le filtre les affiche. */
export function useSearchTrips(originRaw, { enabled = false, connections = false } = {}) {
  return useQuery({
    queryKey: searchQueryKey(originRaw, connections),
    queryFn: () => searchTrips(originRaw, { connections }),
    enabled: enabled && !!originRaw,
    staleTime: SEARCH_STALE_MS,
    gcTime: SEARCH_GC_MS,
    placeholderData: (previousData) => previousData,
  });
}

export function prefetchSearchTrips(queryClient, originRaw, { connections = false } = {}) {
  if (!originRaw) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: searchQueryKey(originRaw, connections),
    queryFn: () => searchTrips(originRaw, { connections }),
    staleTime: SEARCH_STALE_MS,
  });
}

export function usePrefetchSearch() {
  const queryClient = useQueryClient();
  return (originRaw) => prefetchSearchTrips(queryClient, originRaw);
}
