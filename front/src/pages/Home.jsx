import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { List, CalendarDays, BarChart3, Sparkles, AlertCircle, Inbox, Search, X } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FiltersPanel from "@/components/FiltersPanel";
import MobileFiltersSheet from "@/components/MobileFiltersSheet";
import {
  DEFAULT_DATE_HORIZON_DAYS,
  countNewItems,
  departuresForCharts,
  enrichSearchGroups,
  filterPreparedGroups,
  formatTripDayLabel,
} from "@/lib/tripTime";
import DestinationGroup from "@/components/DestinationGroup";
import DestinationGroupSkeleton from "@/components/DestinationGroupSkeleton";
import CalendarView from "@/components/CalendarView";
import Disclaimer from "@/components/Disclaimer";
import WelcomeModal from "@/components/WelcomeModal";
import QuickFilters from "@/components/QuickFilters";
import { timeAgo } from "@/components/SyncBadge";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { NEW_TRIP_TITLE } from "@/components/NewBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchTrips } from "@/hooks/useSearchTrips";
import {
  clearHidden,
  getHidden,
  getSavedFilters,
  hideDestination,
  saveFilters,
  unhideDestination,
} from "@/lib/storage";
import {
  filtersToRemember,
  filtersWithDefaults,
  parseSearchState,
  serializeSearchState,
} from "@/lib/urlState";
import { filterGroupsByDestination } from "@/lib/destinationSearch";
import { cn } from "@/lib/utils";
// Illustration de l'accueil, hébergée avec l'app (WebP, 16 Ko au lieu d'un PNG de 690 Ko).
import emptyStateImage from "@/assets/empty-state.webp";

// Recharts (~la moitié du JavaScript de l'app) n'est chargé qu'à l'ouverture de l'onglet.
const PeakHoursChart = lazy(() => import("@/components/PeakHoursChart"));


/**
 * État de recherche d'après l'URL. Un lien partagé (avec `gare`) impose ses filtres ;
 * sans gare dans l'URL, on reprend les derniers filtres utilisés sur cet appareil.
 */
function searchStateFromLocation() {
  const state = parseSearchState(window.location.search);
  if (!state.station) state.filters = filtersWithDefaults(getSavedFilters() ?? {});
  return state;
}

const MOBILE_INITIAL_DESTINATIONS = 10;
const MOBILE_DESTINATIONS_STEP = 5;

export default function Home({ syncInfo, registerRerunSearch }) {
  const [initial] = useState(searchStateFromLocation);
  const [origin, setOrigin] = useState(initial.station);
  const [searchOrigin, setSearchOrigin] = useState(initial.station?.raw ?? null);
  const [filters, setFilters] = useState(initial.filters);
  const deferredFilters = useDeferredValue(filters);
  const [isPending, startTransition] = useTransition();
  const [animateResults, setAnimateResults] = useState(false);
  const [hidden, setHidden] = useState(getHidden());
  const [tab, setTab] = useState(initial.tab);
  const [destQuery, setDestQuery] = useState(initial.destQuery);
  const deferredDestQuery = useDeferredValue(destQuery);
  const [mobileVisibleDestinations, setMobileVisibleDestinations] = useState(MOBILE_INITIAL_DESTINATIONS);
  const isDesktop = useIsDesktop();

  // Les correspondances (~85 % du volume) ne sont chargées que si le filtre les affiche.
  const wantConnections = filters.maxConnections > 0;
  const {
    data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    refetch,
  } = useSearchTrips(searchOrigin, { enabled: !!searchOrigin, connections: wantConnections });
  const loadingConnections = wantConnections && isPlaceholderData && isFetching;

  const loading = isLoading;
  const refreshing = isFetching && !!data;
  const uiPending = isPending || (isFetching && !data);

  const onFiltersChange = useCallback((next) => {
    startTransition(() => {
      setAnimateResults(false);
      setFilters(next);
    });
  }, []);

  const handleSearch = useCallback((station) => {
    if (!station || !station.raw) {
      toast.error("Sélectionnez une gare valide");
      return;
    }
    startTransition(() => {
      setOrigin(station);
      setSearchOrigin(station.raw);
      setAnimateResults(false);
      setDestQuery(""); // nouvelle gare : la recherche de destination repart de zéro
    });
  }, []);

  // Derniers filtres mémorisés pour la prochaine visite (sans le jour choisi, ponctuel).
  useEffect(() => {
    saveFilters(filtersToRemember(filters));
  }, [filters]);

  // Recherche → URL. Nouvelle gare = nouvelle entrée d'historique (bouton « Précédent ») ;
  // filtres, onglet et destination remplacent l'entrée courante.
  const urlStationRef = useRef(initial.station?.raw ?? null);
  useEffect(() => {
    const query = serializeSearchState({
      station: searchOrigin ? { raw: searchOrigin } : null,
      filters,
      destQuery: deferredDestQuery,
      tab,
    });
    const { pathname, search, hash } = window.location;
    if (query === search) return;
    const url = `${pathname}${query}${hash}`;
    if ((searchOrigin ?? null) !== urlStationRef.current) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    urlStationRef.current = searchOrigin ?? null;
  }, [searchOrigin, filters, deferredDestQuery, tab]);

  // « Précédent » / « Suivant » : l'URL redevient la source de vérité.
  useEffect(() => {
    const onPopState = () => {
      const state = searchStateFromLocation();
      urlStationRef.current = state.station?.raw ?? null;
      startTransition(() => {
        setOrigin(state.station);
        setSearchOrigin(state.station?.raw ?? null);
        setFilters(state.filters);
        setDestQuery(state.destQuery);
        setTab(state.tab);
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const toastedOrigin = useRef(null);

  useEffect(() => {
    if (!isFetching && data) setAnimateResults(true);
  }, [isFetching, data]);

  useEffect(() => {
    if (!searchOrigin || isFetching || !data) return;
    if (toastedOrigin.current === searchOrigin) return;
    toastedOrigin.current = searchOrigin;
    if (data.total_trips === 0 && data.served && !data.omitted_connected_trips) {
      toast.info("Aucun train à 0€ pour le moment — réessayez plus tard.");
    }
  }, [searchOrigin, isFetching, data]);

  useEffect(() => {
    if (!isError) return;
    const status = error?.response?.status;
    if (status === 429) toast.error("Trop de recherches. Patientez 1 minute.");
    else if (status === 400) toast.error("Aucune gare valide sélectionnée");
    else toast.error("Erreur lors de la recherche");
  }, [isError, error]);

  useEffect(() => {
    registerRerunSearch?.(() => {
      if (searchOrigin) refetch();
    });
    return () => registerRerunSearch?.(null);
  }, [searchOrigin, refetch, registerRerunSearch]);

  const preparedGroups = useMemo(
    () => enrichSearchGroups(data?.groups),
    [data]
  );

  const filteredCacheRef = useRef(new Map());

  const { groups: filteredGroups, totalTrips } = useMemo(() => {
    const { groups, totalTrips: total, cache } = filterPreparedGroups(
      preparedGroups,
      deferredFilters,
      hidden,
      filteredCacheRef.current
    );
    filteredCacheRef.current = cache;
    return { groups, totalTrips: total };
  }, [preparedGroups, deferredFilters, hidden]);

  // Recherche « Où voulez-vous aller ? » appliquée après les filtres.
  const visibleGroups = useMemo(
    () => filterGroupsByDestination(filteredGroups, deferredDestQuery),
    [filteredGroups, deferredDestQuery]
  );
  const visibleTrips = useMemo(
    () => (visibleGroups === filteredGroups ? totalTrips : visibleGroups.reduce((n, g) => n + g.trip_count, 0)),
    [visibleGroups, filteredGroups, totalTrips]
  );

  const visibleNew = useMemo(
    () => visibleGroups.reduce((n, g) => n + countNewItems(g.trips, g.connected_trips), 0),
    [visibleGroups]
  );

  const chartTrips = useMemo(
    () => (tab === "chart" ? departuresForCharts(visibleGroups) : []),
    [visibleGroups, tab]
  );

  // Le calendrier montre tous les jours de l'horizon, même si un jour est sélectionné.
  const calendarTrips = useMemo(() => {
    if (tab !== "calendar") return [];
    const { groups } = filterPreparedGroups(
      preparedGroups,
      { ...deferredFilters, selectedDate: null },
      hidden
    );
    return departuresForCharts(filterGroupsByDestination(groups, deferredDestQuery));
  }, [preparedGroups, deferredFilters, hidden, tab, deferredDestQuery]);

  const onSelectDay = useCallback(
    (date) => {
      onFiltersChange({ ...filters, selectedDate: date });
      setTab("list");
    },
    [filters, onFiltersChange]
  );
  const clearSelectedDay = () => onFiltersChange({ ...filters, selectedDate: null });

  useEffect(() => {
    setMobileVisibleDestinations(MOBILE_INITIAL_DESTINATIONS);
  }, [data?.origin, visibleGroups.length]);

  const onHide = useCallback((key) => {
    hideDestination(key);
    setHidden(getHidden());
    toast(`Destination « ${key} » masquée`, {
      action: {
        label: "Annuler",
        onClick: () => {
          unhideDestination(key);
          setHidden(getHidden());
        },
      },
    });
  }, []);
  const onResetHidden = () => { clearHidden(); setHidden([]); };
  const clearFilters = () => {
    onFiltersChange(filtersWithDefaults());
    setDestQuery("");
  };

  const showEmpty = !data && !loading && !searchOrigin;
  const showResults = data && data.served && data.total_trips > 0;

  return (
    <>
      <WelcomeModal />

      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Sparkles className="h-3.5 w-3.5" /> {syncInfo?.total_trips ? `${syncInfo.total_trips.toLocaleString("fr-FR")} trajets éligibles suivis en France` : "Synchronisation en cours…"}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0A2540] leading-[1.05]">
              Tous les trajets éligibles <span className="text-[#10B981]">à 0€</span><br />
              depuis votre gare.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl">
              Saisissez votre gare de départ : MaxTracker reprend les disponibilités TGV Max publiées chaque matin
              par la SNCF et regroupe pour vous toutes les destinations accessibles depuis n'importe quelle gare TGV.
            </p>
          </div>

          <div className="mt-8">
            <SearchBar
              origin={origin}
              onOriginChange={setOrigin}
              onSearch={handleSearch}
              loading={uiPending}
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading && <ResultsSkeleton />}

        {showEmpty && <EmptyHero />}

        {!loading && data && !data.served && (
          <NotServed origin={data.origin} />
        )}

        {!loading && data && data.served && data.total_trips === 0 && (
          <NoTrains
            origin={data.origin}
            omittedConnections={data.omitted_connected_trips || 0}
            onShowConnections={() => onFiltersChange({ ...filters, maxConnections: 1 })}
          />
        )}

        {showResults && (
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mt-2">
            {refreshing && (
              <div
                className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] rounded-2xl pointer-events-none"
                data-testid="results-refresh-overlay"
                aria-hidden
              >
                <div className="sticky top-24 p-4 space-y-4 opacity-70">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <DestinationGroupSkeleton key={i} />
                  ))}
                </div>
              </div>
            )}

            {isDesktop && (
              <div className="lg:col-span-3 order-2 lg:order-1">
                <FiltersPanel
                  filters={filters}
                  onChange={onFiltersChange}
                  hiddenCount={hidden.length}
                  onResetHidden={onResetHidden}
                  totalDestinations={visibleGroups.length}
                />
              </div>
            )}

            <div className="lg:col-span-9 order-1 lg:order-2">
              <Tabs value={tab} onValueChange={setTab} data-testid="results-tabs">
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <div>
                    <h2 className="text-[22px] font-extrabold lg:text-2xl lg:font-bold text-[#0A2540]">
                      Au départ de <span className="text-[#10B981]">{data.origin}</span>
                    </h2>
                    <div className="text-sm text-slate-500 mt-0.5">
                      <span className="font-mono">{visibleTrips}</span> trajet{visibleTrips > 1 ? "s" : ""} ·{" "}
                      <span className="font-mono">{visibleGroups.length}</span> destination{visibleGroups.length > 1 ? "s" : ""}
                      {visibleNew > 0 && (
                        <>
                          {" · "}
                          <span className="font-semibold text-violet-700 dark:text-violet-300" data-testid="new-count" title={NEW_TRIP_TITLE}>
                            <span className="font-mono">{visibleNew}</span> nouveau{visibleNew > 1 ? "x" : ""}
                          </span>
                        </>
                      )}
                      {refreshing && (
                        <span className="ml-2 text-[#10B981]">
                          · {loadingConnections ? "Chargement des correspondances…" : "Mise à jour…"}
                        </span>
                      )}
                    </div>
                    {!isDesktop && (
                      <p className="mt-0.5 text-xs text-slate-500" data-testid="mobile-sync-line">
                        Données SNCF à jour · vérifiées {timeAgo(syncInfo?.last_attempt_at || syncInfo?.last_sync_at)}
                      </p>
                    )}
                  </div>
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="list" data-testid="tab-list"><List className="h-4 w-4 mr-1.5" /> Liste</TabsTrigger>
                    <TabsTrigger value="calendar" data-testid="tab-calendar"><CalendarDays className="h-4 w-4 mr-1.5" /> Calendrier</TabsTrigger>
                    <TabsTrigger value="chart" data-testid="tab-chart"><BarChart3 className="h-4 w-4 mr-1.5" /> Pics horaires</TabsTrigger>
                  </TabsList>
                </div>

                {!isDesktop && (
                  <div className="mb-3">
                    <QuickFilters filters={filters} onChange={onFiltersChange} />
                  </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      inputMode="search"
                      enterKeyHint="search"
                      value={destQuery}
                      onChange={(e) => setDestQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && setDestQuery("")}
                      placeholder="Où voulez-vous aller ?"
                      aria-label="Filtrer les destinations"
                      autoComplete="off"
                      className="w-full h-10 pl-9 pr-9 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#0A2540]/10 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                      data-testid="destination-search"
                    />
                    {destQuery && (
                      <button
                        type="button"
                        onClick={() => setDestQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Effacer la recherche de destination"
                        data-testid="destination-search-clear"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                {filters.selectedDate && (
                  <div data-testid="day-filter-chip">
                    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold filter-chip-active">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatTripDayLabel(filters.selectedDate)}
                      <button
                        type="button"
                        onClick={clearSelectedDay}
                        className="-mr-1 rounded-full p-0.5 hover:bg-white/20"
                        aria-label="Afficher tous les jours"
                        title="Afficher tous les jours"
                        data-testid="day-filter-clear"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                )}
                </div>

                <TabsContent value="list">
                  {visibleGroups.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500" data-testid="no-results-after-filter">
                      {filteredGroups.length > 0 && deferredDestQuery.trim() ? (
                        <>
                          Aucune destination ne correspond à « {deferredDestQuery.trim()} ».{" "}
                          <button
                            type="button"
                            onClick={() => setDestQuery("")}
                            className="font-semibold text-[#0A2540] underline dark:text-emerald-300"
                          >
                            Effacer la recherche
                          </button>
                        </>
                      ) : isDesktop ? (
                        "Aucun résultat avec ces filtres."
                      ) : (
                        <>
                          Aucun trajet avec ces filtres.
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mx-auto mt-3 block min-h-11 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-900"
                            data-testid="mobile-clear-filters"
                          >
                            Effacer les filtres
                          </button>
                        </>
                      )}
                    </div>
                  ) : isDesktop ? (
                    <div className={cn("space-y-4", animateResults && "stagger")}>
                      {visibleGroups.map((g) => (
                        <DestinationGroup key={g.destination_city} group={g} onHide={onHide} />
                      ))}
                    </div>
                  ) : (
                    <div className={cn("space-y-3", animateResults && "stagger")}>
                      {visibleGroups.slice(0, mobileVisibleDestinations).map((g) => (
                        <DestinationGroup key={g.destination_city} group={g} onHide={onHide} />
                      ))}
                      {visibleGroups.length > mobileVisibleDestinations && (
                        <button
                          type="button"
                          onClick={() => setMobileVisibleDestinations((prev) => prev + MOBILE_DESTINATIONS_STEP)}
                          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0A2540] hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
                          data-testid="mobile-load-more-destinations"
                        >
                          Afficher {MOBILE_DESTINATIONS_STEP} destinations de plus ({visibleGroups.length - mobileVisibleDestinations} restantes)
                        </button>
                      )}
                    </div>
                  )}
                  {!isDesktop && hidden.length > 0 && (
                    <button
                      type="button"
                      onClick={onResetHidden}
                      className="mt-3 w-full min-h-11 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600"
                      data-testid="mobile-reset-hidden-btn"
                    >
                      {hidden.length} destination{hidden.length > 1 ? "s" : ""} masquée{hidden.length > 1 ? "s" : ""} · Réafficher
                    </button>
                  )}
                </TabsContent>

                <TabsContent value="calendar">
                  {tab === "calendar" && (
                    <CalendarView
                      trips={calendarTrips}
                      horizonDays={deferredFilters.dateHorizonDays ?? DEFAULT_DATE_HORIZON_DAYS}
                      selectedDate={filters.selectedDate}
                      onSelectDay={onSelectDay}
                    />
                  )}
                </TabsContent>

                <TabsContent value="chart">
                  {tab === "chart" && (
                    <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
                      <PeakHoursChart trips={chartTrips} />
                    </Suspense>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {showResults && !isDesktop && (
          <MobileFiltersSheet
            filters={filters}
            onFiltersChange={onFiltersChange}
            hiddenCount={hidden.length}
            onResetHidden={onResetHidden}
            totalDestinations={visibleGroups.length}
          />
        )}

        <Disclaimer />
      </section>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2" data-testid="loading-skeleton">
      <div className="lg:col-span-3">
        <Skeleton className="h-96 rounded-2xl" />
      </div>
      <div className="lg:col-span-9 space-y-4">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <DestinationGroupSkeleton key={i} withTrips={i < 2} />
        ))}
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="mt-8 grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-2xl p-8 md:p-12" data-testid="empty-hero">
      <div>
        <h3 className="text-2xl font-bold text-[#0A2540] mb-2">Prêt à voyager ?</h3>
        <p className="text-slate-600">
          Choisissez votre gare de départ ci-dessus pour voir instantanément <strong>toutes les destinations </strong>
          réservables à 0€ avec votre abonnement TGV Max dans les <strong>30 prochains jours</strong>.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Regroupement intelligent par ville</li>
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Vue Calendrier des 30 jours</li>
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Lien direct vers SNCF Connect</li>
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Badge et filtre « départ possible aujourd&apos;hui », week-end, créneaux</li>
        </ul>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-[4/3]">
        <img src={emptyStateImage} alt="" width={1024} height={1024} decoding="async" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function NotServed({ origin }) {
  return (
    <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-8 flex items-start gap-4" data-testid="not-served-msg">
      <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
      <div>
        <h3 className="text-lg font-bold text-amber-900 mb-1">Gare non desservie par TGV Max</h3>
        <p className="text-amber-800 text-sm">
          La gare <strong>« {origin} »</strong> ne fait pas partie de l'offre TGV Max dans nos données actuelles.
          Vérifiez l'orthographe ou choisissez une grande gare TGV (Paris, Lyon, Bordeaux, Marseille…).
        </p>
      </div>
    </div>
  );
}

function NoTrains({ origin, omittedConnections = 0, onShowConnections }) {
  if (omittedConnections > 0) {
    return (
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-10 text-center" data-testid="no-direct-trains-msg">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
          <Inbox className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-2xl font-bold text-[#0A2540] mb-2">Aucun trajet direct à 0€</h3>
        <p className="text-slate-600 max-w-md mx-auto">
          Pas de train direct au départ de <strong>« {origin} »</strong> pour le moment, mais{" "}
          <strong>{omittedConnections.toLocaleString("fr-FR")}</strong> parcours avec correspondance sont disponibles.
        </p>
        <button
          type="button"
          onClick={onShowConnections}
          className="mt-5 h-11 px-6 rounded-xl bg-[#0A2540] hover:bg-[#173A5E] text-white font-semibold transition-colors"
          data-testid="show-connections-btn"
        >
          Voir les trajets avec 1 correspondance
        </button>
      </div>
    );
  }
  return (
    <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-10 text-center" data-testid="no-trains-msg">
      <div className="inline-flex h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-2xl font-bold text-[#0A2540] mb-2">Aucun train à 0€ disponible</h3>
      <p className="text-slate-600 max-w-md mx-auto">
        Aucun billet TGV Max à 0€ trouvé au départ de <strong>« {origin} »</strong> dans les 30 prochains jours.
        Les disponibilités évoluent fréquemment — réessayez après la prochaine synchronisation.
      </p>
    </div>
  );
}
