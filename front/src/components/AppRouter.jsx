import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SyncBadge from "@/components/SyncBadge";
import Home from "@/pages/Home";
import { getSyncInfo, triggerSync } from "@/lib/api";
import { APP_VIEW, viewFromHash } from "@/lib/appView";

const About = lazy(() => import("@/pages/About"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SYNC_COOLDOWN_MS = 3 * 60 * 1000;
const SYNC_HEARTBEAT_MS = 60 * 1000;

/** Délai annoncé par le serveur (en-tête Retry-After, en secondes) après un 429. */
function retryAfterMs(headerValue) {
  const seconds = Number.parseInt(headerValue, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : SYNC_COOLDOWN_MS;
}

function nextSyncPollDelay(info) {
  if (!info?.next_sync_at) return SYNC_HEARTBEAT_MS;
  const wait = new Date(info.next_sync_at).getTime() - Date.now();
  if (!Number.isFinite(wait)) return SYNC_HEARTBEAT_MS;
  if (wait <= 0) return 8_000;
  return Math.min(wait + 3_000, SYNC_HEARTBEAT_MS);
}

export default function AppRouter() {
  const [view, setView] = useState(viewFromHash);
  const [syncInfo, setSyncInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const rerunSearchRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let timeoutId;
    let cancelled = false;

    const poll = async () => {
      try {
        const info = await getSyncInfo();
        if (cancelled) return;
        setSyncInfo(info);
        timeoutId = setTimeout(poll, nextSyncPollDelay(info));
      } catch {
        if (!cancelled) timeoutId = setTimeout(poll, SYNC_HEARTBEAT_MS);
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timeoutId);
      poll();
    };

    poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const onManualSync = useCallback(async () => {
    if (refreshing || Date.now() < cooldownUntil) return;
    setRefreshing(true);
    try {
      const result = await triggerSync();
      const info = await getSyncInfo();
      setSyncInfo(info);
      setCooldownUntil(Date.now() + SYNC_COOLDOWN_MS);
      if (result?.status === "skipped" && result?.reason === "sync_in_progress") {
        toast.info("Une synchronisation est déjà en cours");
      } else if (result?.status === "error") {
        toast.error("Données SNCF indisponibles — les données actuelles sont conservées");
      } else {
        toast.success("Synchronisation effectuée");
        rerunSearchRef.current?.();
      }
    } catch (err) {
      if (err?.response?.status === 429) {
        setCooldownUntil(Date.now() + retryAfterMs(err.response.headers?.["retry-after"]));
        toast.info("Une synchronisation vient d'être lancée. Réessayez un peu plus tard.");
      } else {
        toast.error("Synchronisation impossible");
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, cooldownUntil]);

  const registerRerunSearch = useCallback((fn) => {
    rerunSearchRef.current = fn;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen hero-radial">
        <AppHeader
          activeView={view}
          trailing={
            <SyncBadge
              info={syncInfo}
              onRefresh={onManualSync}
              refreshing={refreshing}
              cooldownUntil={cooldownUntil}
            />
          }
        />
        {view === APP_VIEW.ABOUT ? (
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
            <About />
          </Suspense>
        ) : (
          <Home syncInfo={syncInfo} registerRerunSearch={registerRerunSearch} />
        )}
      </div>
    </QueryClientProvider>
  );
}
