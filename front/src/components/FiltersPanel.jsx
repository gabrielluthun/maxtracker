import { memo, useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Clock4,
  Hourglass,
  Train,
  Filter,
  RotateCw,
  Sun,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DATE_HORIZON_OPTIONS,
  DEFAULT_DATE_HORIZON_DAYS,
  MAX_DURATION_OPTIONS,
} from "@/lib/tripTime";
import { cn } from "@/lib/utils";

const FILTER_CHIP_ACTIVE =
  "filter-chip-active";
const FILTER_CHIP_INACTIVE =
  "filter-chip-inactive";

const TIME_SLOTS = [
  { id: "morning", label: "Matin", from: 0, to: 12, icon: "☀️" },
  { id: "afternoon", label: "Après-midi", from: 12, to: 18 },
  { id: "evening", label: "Soir", from: 18, to: 24 },
];

function hasSimpleFiltersActive(filters) {
  if (!filters.showInoui || !filters.showIntercites || !filters.showIntercitesNuit) return true;
  if ((filters.maxConnections ?? 0) !== 0) return true;
  return false;
}

function hasAdvancedFiltersActive(filters) {
  if (filters.departureTodayOnly || filters.weekendOnly) return true;
  if (
    (filters.dateHorizonDays ?? DEFAULT_DATE_HORIZON_DAYS) !== DEFAULT_DATE_HORIZON_DAYS ||
    filters.maxDurationMinutes != null
  ) {
    return true;
  }
  const { morning, afternoon, evening } = filters.timeSlots || {};
  if (!morning || !afternoon || !evening) return true;
  return false;
}

function CollapsibleFilterSection({
  title,
  open,
  onToggle,
  showActiveBadge,
  toggleTestId,
  sectionTestId,
  badgeTestId,
  withTopBorder = false,
  children,
}) {
  return (
    <div className={cn(withTopBorder && "pt-4 border-t border-slate-100 dark:border-slate-700")}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 text-left"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={toggleTestId}
      >
        <span className="font-medium text-slate-800 dark:text-slate-100">{title}</span>
        <span className="flex items-center gap-2 shrink-0">
          {showActiveBadge && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20 filter-accent-highlight"
              data-testid={badgeTestId}
            >
              Actif
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ease-out",
              open && "rotate-180"
            )}
          />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={cn(
              "space-y-5 mt-4 transition-opacity duration-200 ease-out",
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            data-testid={sectionTestId}
            aria-hidden={!open}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChipGrid({ options, selected, onSelect, activeClassName = FILTER_CHIP_ACTIVE }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map(({ value, label, testId }) => (
        <button
          key={String(value)}
          type="button"
          data-testid={testId}
          onClick={() => onSelect(value)}
          className={cn(
            "px-2 py-2 rounded-lg border text-xs font-semibold",
            selected === value ? activeClassName : FILTER_CHIP_INACTIVE
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FiltersPanel({ filters, onChange, hiddenCount, onResetHidden, totalDestinations, className }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const simpleActive = hasSimpleFiltersActive(filters);
  const advancedActive = hasAdvancedFiltersActive(filters);
  const [simpleOpen, setSimpleOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleSimple = () => {
    setSimpleOpen((prev) => {
      const next = !prev;
      if (next) setAdvancedOpen(false);
      return next;
    });
  };

  const toggleAdvanced = () => {
    setAdvancedOpen((prev) => {
      const next = !prev;
      if (next) setSimpleOpen(false);
      return next;
    });
  };

  useEffect(() => {
    if (advancedActive) {
      setAdvancedOpen(true);
      setSimpleOpen(false);
    }
  }, [advancedActive]);

  return (
    <aside
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sticky top-24",
        className
      )}
      data-testid="filters-panel"
    >
      <div className="flex items-center gap-2 mb-5">
        <Filter className="h-5 w-5 text-[#0A2540] dark:text-slate-200" strokeWidth={2.5} />
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Filtres</h3>
      </div>

      <div className="space-y-5">
        <CollapsibleFilterSection
          title="Filtres simples"
          open={simpleOpen}
          onToggle={toggleSimple}
          showActiveBadge={simpleActive && !simpleOpen}
          toggleTestId="filters-simple-toggle"
          sectionTestId="filters-simple-section"
          badgeTestId="filters-simple-active-badge"
        >
          <div>
            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100 mb-2">
              <Train className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Type de train
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => set("showInoui", !filters.showInoui)}
                data-testid="filter-inoui"
                className={`px-2 py-2 rounded-lg border text-xs font-semibold ${
                  filters.showInoui
                    ? "bg-[#E11D48] text-white border-[#E11D48]"
                    : "filter-train-inactive"
                }`}
              >
                TGV INOUI / OUIGO
              </button>
              <button
                onClick={() => set("showIntercites", !filters.showIntercites)}
                data-testid="filter-intercites"
                className={`px-2 py-2 rounded-lg border text-xs font-semibold ${
                  filters.showIntercites
                    ? "bg-[#0284C7] text-white border-[#0284C7]"
                    : "filter-train-inactive"
                }`}
              >
                INTERCITÉS
              </button>
              <button
                onClick={() => set("showIntercitesNuit", !filters.showIntercitesNuit)}
                data-testid="filter-intercites-nuit"
                className={`px-2 py-2 rounded-lg border text-xs font-semibold ${
                  filters.showIntercitesNuit
                    ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                    : "filter-train-inactive"
                }`}
              >
                INTERCITÉS DE NUIT
              </button>
            </div>
          </div>

          <div>
            <div className="font-medium text-slate-800 dark:text-slate-100 mb-2">Correspondances max</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 0, label: "Direct", testId: "filter-connections-0" },
                { value: 1, label: "1", testId: "filter-connections-1" },
                { value: 2, label: "2", testId: "filter-connections-2" },
              ].map(({ value, label, testId }) => (
                <button
                  key={value}
                  type="button"
                  data-testid={testId}
                  onClick={() => set("maxConnections", value)}
                  className={cn(
                    "px-2 py-2 rounded-lg border text-xs font-semibold",
                    filters.maxConnections === value ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleFilterSection>

        <CollapsibleFilterSection
          title="Filtres avancés"
          open={advancedOpen}
          onToggle={toggleAdvanced}
          showActiveBadge={advancedActive && !advancedOpen}
          toggleTestId="filters-advanced-toggle"
          sectionTestId="filters-advanced-section"
          badgeTestId="filters-advanced-active-badge"
          withTopBorder
        >
              <div>
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100 mb-2">
                  <CalendarRange className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Horizon de dates
                </div>
                <FilterChipGrid
                  options={DATE_HORIZON_OPTIONS}
                  selected={filters.dateHorizonDays ?? DEFAULT_DATE_HORIZON_DAYS}
                  onSelect={(v) => set("dateHorizonDays", v)}
                />
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Départs à partir d&apos;aujourd&apos;hui, sur la période choisie
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100 mb-2">
                  <Clock4 className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Créneaux horaires
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => set("timeSlots", { ...filters.timeSlots, [s.id]: !filters.timeSlots[s.id] })}
                      data-testid={`filter-time-${s.id}`}
                      className={cn(
                        "px-2 py-2 rounded-lg border text-xs font-semibold",
                        filters.timeSlots[s.id] ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100 mb-2">
                  <Hourglass className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Durée totale max
                </div>
                <FilterChipGrid
                  options={MAX_DURATION_OPTIONS}
                  selected={filters.maxDurationMinutes ?? null}
                  onSelect={(v) => set("maxDurationMinutes", v)}
                />
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Porte à porte (direct ou avec correspondance)
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                    <Sun className="h-4 w-4 text-[#10B981]" /> Départ aujourd&apos;hui
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Masque les destinations sans train aujourd&apos;hui
                  </div>
                </div>
                <Switch
                  data-testid="filter-today"
                  checked={filters.departureTodayOnly}
                  onCheckedChange={(v) => set("departureTodayOnly", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                    <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Week-end uniquement
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Samedis et dimanches</div>
                </div>
                <Switch
                  data-testid="filter-weekend"
                  checked={filters.weekendOnly}
                  onCheckedChange={(v) => set("weekendOnly", v)}
                />
              </div>
        </CollapsibleFilterSection>

        {hiddenCount > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {hiddenCount} destination{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""}
            </div>
            <button
              onClick={onResetHidden}
              data-testid="reset-hidden-btn"
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#0A2540] dark:hover:text-slate-100 py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" /> Réafficher tout
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-mono">
          {totalDestinations} destination{totalDestinations > 1 ? "s" : ""} disponible
          {totalDestinations > 1 ? "s" : ""}
        </div>
      </div>
    </aside>
  );
}

export default memo(FiltersPanel);
