import { useMemo } from "react";
import {
  calendarDays,
  DEFAULT_DATE_HORIZON_DAYS,
  formatTripDayLabel,
  getParisClock,
  mondayFirstWeekdayIndex,
} from "@/lib/tripTime";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export default function CalendarView({
  trips,
  horizonDays = DEFAULT_DATE_HORIZON_DAYS,
  selectedDate = null,
  onSelectDay,
}) {
  const counts = useMemo(() => {
    const map = {};
    for (const t of trips) {
      map[t.date] = (map[t.date] || 0) + 1;
    }
    return map;
  }, [trips]);

  // Dates ISO en heure de Paris, comme `trip.date` côté SNCF : les clés des
  // cases correspondent donc exactement aux dates des trajets.
  const { today } = getParisClock();
  const cells = useMemo(() => calendarDays(today, horizonDays), [today, horizonDays]);

  const max = Math.max(1, ...Object.values(counts));
  const padStart = mondayFirstWeekdayIndex(cells[0]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="calendar-view">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <h3 className="font-semibold text-lg text-slate-900">
          Calendrier des {horizonDays} prochains jours
        </h3>
        <div className="text-xs text-slate-500 font-mono">{trips.length} trains au total</div>
      </div>
      <p className="text-xs text-slate-500 mb-4">Choisissez un jour pour voir ses trajets.</p>
      <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2" aria-hidden="true">
        {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
        {cells.map((k) => {
          const n = counts[k] || 0;
          const intensity = n === 0 ? 0 : 0.15 + (n / max) * 0.85;
          const isToday = k === today;
          const strong = intensity > 0.5;
          const label = `${formatTripDayLabel(k)} : ${n} trajet${n > 1 ? "s" : ""}`;
          return (
            <button
              key={k}
              type="button"
              data-testid={`cal-cell-${k}`}
              disabled={n === 0}
              onClick={() => onSelectDay?.(k)}
              aria-label={label}
              aria-pressed={selectedDate === k}
              title={n > 0 ? `Voir les trajets du ${formatTripDayLabel(k).toLowerCase()}` : undefined}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-center border border-slate-100 transition",
                n === 0 && "bg-slate-50 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 cursor-default",
                n > 0 && (strong ? "text-white" : "text-slate-900 dark:text-slate-100"),
                n > 0 && "hover:scale-[1.04] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                isToday && "ring-2 ring-[#0A2540] dark:ring-emerald-300 ring-offset-1 ring-offset-white dark:ring-offset-slate-900",
                selectedDate === k && "ring-4 ring-amber-400 dark:ring-amber-300"
              )}
              style={n > 0 ? { background: `rgba(16,185,129,${intensity})` } : undefined}
            >
              <span className="text-[11px] opacity-70">{Number(k.slice(8, 10))}</span>
              <span className="font-mono text-sm font-semibold leading-none mt-0.5">{n || ""}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500" aria-hidden="true">
        Moins
        {[0.15, 0.35, 0.55, 0.8, 1].map((v) => (
          <div key={v} className="h-3 w-5 rounded" style={{ background: `rgba(16,185,129,${v})` }} />
        ))}
        Plus
      </div>
    </div>
  );
}
