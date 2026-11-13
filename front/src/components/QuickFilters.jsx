import { Sparkles } from "lucide-react";
import { QUICK_FILTERS, isQuickFilterOn, toggleQuickFilter } from "@/lib/quickFilters";
import { cn } from "@/lib/utils";

/** Raccourcis « Aujourd'hui · Week-end · Nouveautés · ≤ 3 h » sous le résumé (mobile). */
export default function QuickFilters({ filters, onChange }) {
  return (
    <div role="group" aria-label="Filtres rapides" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
      {QUICK_FILTERS.map(({ key, label }) => {
        const on = isQuickFilterOn(filters, key);
        const violet = key === "new";
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(toggleQuickFilter(filters, key))}
            className={cn(
              "h-11 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
              violet
                ? on
                  ? "bg-violet-600 text-white border-violet-600"
                  : "filter-chip-inactive !text-violet-700 dark:!text-violet-300"
                : on
                  ? "filter-chip-active"
                  : "filter-chip-inactive"
            )}
            data-testid={`quick-filter-${key}`}
          >
            {violet && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
