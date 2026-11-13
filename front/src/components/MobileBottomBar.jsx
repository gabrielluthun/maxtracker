import { BarChart3, CalendarDays, List, ListFilter } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const VIEWS = [
  { value: "list", label: "Liste", icon: List, testId: "tab-list" },
  { value: "calendar", label: "Calendrier", icon: CalendarDays, testId: "tab-calendar" },
  { value: "chart", label: "Horaires", icon: BarChart3, testId: "tab-chart" },
];

/** Barre du bas (mobile) : vues Liste / Calendrier / Horaires et bouton Filtres. À rendre dans `<Tabs>`. */
export default function MobileBottomBar({ activeCount, onOpenFilters }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <TabsList className="flex-1 grid grid-cols-3 h-auto gap-0.5 rounded-xl bg-slate-100 p-[3px]">
        {VIEWS.map(({ value, label, icon: Icon, testId }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="min-h-11 flex-col gap-0.5 rounded-[9px] px-1 py-1 text-[11px] font-semibold"
            data-testid={testId}
          >
            <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-haspopup="dialog"
        aria-label={activeCount > 0 ? `Filtres, ${activeCount} actif${activeCount > 1 ? "s" : ""}` : "Filtres"}
        title="Filtres"
        // Couleurs en valeurs explicites : index.css réécrit `bg-slate-100` / `text-slate-900` en mode nuit.
        className="relative h-[50px] w-[50px] shrink-0 flex items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-[#F1F5F9] dark:text-[#0A0F1C]"
        data-testid="mobile-filters-open-btn"
      >
        <ListFilter className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-[#052E1F] ring-2 ring-white dark:ring-slate-900"
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
