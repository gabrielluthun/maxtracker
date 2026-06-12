import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchTrips } from "@/lib/api";

export const SEARCH_STALE_MS = 5 * 60_000;
export const SEARCH_GC_MS = 30 * 60_000;

export function searchQueryKey(originRaw) {
  return ["search", originRaw];
}

export function useSearchTrips(originRaw, { enabled = false } = {}) {
  return useQuery({
    queryKey: searchQueryKey(originRaw),
    queryFn: () => searchTrips(originRaw),
    enabled: enabled && !!originRaw,
    staleTime: SEARCH_STALE_MS,
    gcTime: SEARCH_GC_MS,
    placeholderData: (previousData) => previousData,
  });
}

export function prefetchSearchTrips(queryClient, originRaw) {
  if (!originRaw) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: searchQueryKey(originRaw),
    queryFn: () => searchTrips(originRaw),
    staleTime: SEARCH_STALE_MS,
  });
}

export function usePrefetchSearch() {
  const queryClient = useQueryClient();
  return (originRaw) => prefetchSearchTrips(queryClient, originRaw);
}
