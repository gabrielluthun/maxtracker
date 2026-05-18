import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Train, List, CalendarDays, BarChart3, Sparkles, AlertCircle, Inbox } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FiltersPanel from "@/components/FiltersPanel";
import { isDeparturePast } from "@/lib/tripTime";
import DestinationGroup from "@/components/DestinationGroup";
import CalendarView from "@/components/CalendarView";
import PeakHoursChart from "@/components/PeakHoursChart";
import SyncBadge from "@/components/SyncBadge";
import Disclaimer from "@/components/Disclaimer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { searchTrips, getSyncInfo, triggerSync } from "@/lib/api";
import { getHidden, unhideDestination, hideDestination } from "@/lib/storage";
import { cn } from "@/lib/utils";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/f74c49b6-18a0-4cb7-95f4-30d605669f9b/images/cfaaa1f6fd3ab022112caad3ff0c854d3d7487ef5ce8eb07cef5ff782c6cb730.png";
const EMPTY_BG = "https://static.prod-images.emergentagent.com/jobs/f74c49b6-18a0-4cb7-95f4-30d605669f9b/images/a8fc6da684e5f05873d772644a95f43d0c632d9f05c9468e3746d24581b9fbec.png";

const defaultFilters = {
  weekendOnly: false,
  timeSlots: { morning: true, afternoon: true, evening: true },
  showInoui: true,
  showIntercites: true,
  showIntercitesNuit: true,
  directOnly: false,
};

export default function Home() {
  const [origin, setOrigin] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncInfo, setSyncInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [animateResults, setAnimateResults] = useState(false);
  const [hidden, setHidden] = useState(getHidden());
  const [tab, setTab] = useState("list");

  const onFiltersChange = (next) => {
    setAnimateResults(false);
    setFilters(next);
  };

  useEffect(() => {
    getSyncInfo().then(setSyncInfo).catch(() => {});
    const id = setInterval(() => getSyncInfo().then(setSyncInfo).catch(() => {}), 60000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = async (station, freshPrices = false) => {
    if (!station || !station.raw) {
      toast.error("Sélectionnez une gare valide");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await searchTrips(station.raw, { freshPrices });
      setData(res);
      setAnimateResults(true);
      if (res.total_trips === 0 && res.served) {
        toast.info("Aucun train à 0€ pour le moment — réessayez plus tard.");
      }
    } catch (e) {
      if (e?.response?.status === 429) toast.error("Trop de recherches. Patientez 1 minute.");
      else if (e?.response?.status === 400) toast.error("Aucune gare valide sélectionnée");
      else toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerSync();
      const info = await getSyncInfo();
      setSyncInfo(info);
      toast.success("Synchronisation effectuée");
      if (origin) handleSearch(origin);
    } catch {
      toast.error("Synchronisation impossible");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    const out = [];
    for (const g of data.groups) {
      if (hidden.includes(g.destination_city)) continue;
      const trips = g.trips.filter((t) => {
        if (isDeparturePast(t.date, t.heure_depart)) return false;
        if (filters.weekendOnly) {
          const day = new Date(`${t.date}T00:00:00`).getDay();
          if (day !== 0 && day !== 6) return false;
        }
        const h = parseInt((t.heure_depart || "0").slice(0, 2), 10);
        const slot = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
        if (!filters.timeSlots[slot]) return false;
        if (t.train_type === "TGV_INOUI" && !filters.showInoui) return false;
        if (t.train_type === "INTERCITES" && !filters.showIntercites) return false;
        if (t.train_type === "INTERCITES_NUIT" && !filters.showIntercitesNuit) return false;
        if (t.fare_eur != null && t.fare_eur > 0) return false;
        return true;
      });
      if (trips.length === 0) continue;
      out.push({ ...g, trips, trip_count: trips.length });
    }
    return out;
  }, [data, filters, hidden]);

  const allFilteredTrips = useMemo(() => filteredGroups.flatMap((g) => g.trips), [filteredGroups]);

  const onHide = (key) => {
    hideDestination(key);
    setHidden(getHidden());
    toast(`Destination « ${key} » masquée`, { action: { label: "Annuler", onClick: () => { unhideDestination(key); setHidden(getHidden()); } } });
  };
  const onResetHidden = () => { localStorage.removeItem("mt_hidden_destinations"); setHidden([]); };

  return (
    <div className="min-h-screen hero-radial">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#0A2540] flex items-center justify-center">
              <Train className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-[18px] font-bold text-[#0A2540] tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                MaxTracker
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">TGV Max · 0€ tracker</div>
            </div>
          </div>
          <SyncBadge info={syncInfo} onRefresh={onRefresh} refreshing={refreshing} />
        </div>
      </header>

      {/* Hero / Search */}
      <section className="relative">
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(250,250,250,0) 0%, rgba(250,250,250,1) 100%), url(${HERO_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Sparkles className="h-3.5 w-3.5" /> {syncInfo?.total_trips ? `${syncInfo.total_trips.toLocaleString("fr-FR")} trains à 0€ référencés` : "Données SNCF Open Data"}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0A2540] leading-[1.05]">
              Tous les trains <span className="relative inline-block">
                <span className="relative z-10 text-[#10B981]">à 0€</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-emerald-100 -z-0 rounded-sm" />
              </span><br />
              depuis votre gare.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl">
              Saisissez votre gare de départ : MaxTracker scanne l'Open Data SNCF en temps quasi-réel et regroupe pour
              vous toutes les destinations encore disponibles avec votre abonnement TGV Max.
            </p>
          </div>

          <div className="mt-8">
            <SearchBar origin={origin} onOriginChange={setOrigin} onSearch={handleSearch} loading={loading} />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading && <ResultsSkeleton />}

        {!loading && !data && (
          <EmptyHero />
        )}

        {!loading && data && !data.served && (
          <NotServed origin={data.origin} />
        )}

        {!loading && data && data.served && data.total_trips === 0 && (
          <NoTrains origin={data.origin} />
        )}

        {!loading && data && data.served && data.total_trips > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mt-2">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <FiltersPanel
                filters={filters}
                onChange={onFiltersChange}
                hiddenCount={hidden.length}
                onResetHidden={onResetHidden}
                totalDestinations={filteredGroups.length}
              />
            </div>

            <div className="lg:col-span-9 order-1 lg:order-2">
              <Tabs value={tab} onValueChange={setTab} data-testid="results-tabs">
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0A2540]">
                      Au départ de <span className="text-[#10B981]">{data.origin}</span>
                    </h2>
                    <div className="text-sm text-slate-500 mt-0.5">
                      <span className="font-mono">{allFilteredTrips.length}</span> trains · <span className="font-mono">{filteredGroups.length}</span> destinations
                    </div>
                  </div>
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="list" data-testid="tab-list"><List className="h-4 w-4 mr-1.5" /> Liste</TabsTrigger>
                    <TabsTrigger value="calendar" data-testid="tab-calendar"><CalendarDays className="h-4 w-4 mr-1.5" /> Calendrier</TabsTrigger>
                    <TabsTrigger value="chart" data-testid="tab-chart"><BarChart3 className="h-4 w-4 mr-1.5" /> Pics horaires</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="list">
                  {filteredGroups.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500" data-testid="no-results-after-filter">
                      Aucun résultat avec ces filtres.
                    </div>
                  ) : (
                    <div className={cn("space-y-4", animateResults && "stagger")}>
                      {filteredGroups.map((g) => (
                        <DestinationGroup key={g.destination_city} group={g} onHide={onHide} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="calendar">
                  <CalendarView trips={allFilteredTrips} />
                </TabsContent>

                <TabsContent value="chart">
                  <PeakHoursChart trips={allFilteredTrips} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        <Disclaimer />
      </section>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2" data-testid="loading-skeleton">
      <div className="lg:col-span-3"><Skeleton className="h-96 rounded-2xl" /></div>
      <div className="lg:col-span-9 space-y-4">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
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
          Choisissez votre gare de départ ci-dessus pour voir instantanément <strong>toutes les destinations</strong>
          encore réservables à 0€ avec votre abonnement TGV Max — dans les 30 prochains jours.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Regroupement intelligent par ville</li>
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Vue Calendrier des 30 jours</li>
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Lien direct vers SNCF Connect</li>
          <li className="flex items-start gap-2"><span className="text-[#10B981] font-bold">→</span> Filtres week-end, créneaux, types de train</li>
        </ul>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-[4/3]">
        <img src={EMPTY_BG} alt="" className="w-full h-full object-cover" />
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

function NoTrains({ origin }) {
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
