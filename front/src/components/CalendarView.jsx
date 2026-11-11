import { useMemo } from "react";
import {
  calendarDays,
  getParisClock,
  mondayFirstWeekdayIndex,
} from "@/lib/tripTime";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const CALENDAR_DAYS = 30;

export default function CalendarView({ trips }) {
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
  const cells = useMemo(() => calendarDays(today, CALENDAR_DAYS), [today]);

  const max = Math.max(1, ...Object.values(counts));
  const padStart = mondayFirstWeekdayIndex(cells[0]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="calendar-view">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-semibold text-lg text-slate-900">Calendrier des 30 prochains jours</h3>
        <div className="text-xs text-slate-500 font-mono">{trips.length} trains au total</div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
        {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
        {cells.map((k) => {
          const n = counts[k] || 0;
          const intensity = n === 0 ? 0 : 0.15 + (n / max) * 0.85;
          const isToday = k === today;
          const strong = intensity > 0.5;
          return (
            <div
              key={k}
              data-testid={`cal-cell-${k}`}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-center border border-slate-100",
                n === 0 && "bg-slate-50 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500",
                n > 0 && (strong ? "text-white" : "text-slate-900 dark:text-slate-100"),
                isToday && "ring-2 ring-[#0A2540] dark:ring-emerald-300 ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
              )}
              style={n > 0 ? { background: `rgba(16,185,129,${intensity})` } : undefined}
            >
              <div className="text-[11px] opacity-70">{Number(k.slice(8, 10))}</div>
              <div className="font-mono text-sm font-semibold leading-none mt-0.5">{n || ""}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
        Moins
        {[0.15, 0.35, 0.55, 0.8, 1].map((v) => (
          <div key={v} className="h-3 w-5 rounded" style={{ background: `rgba(16,185,129,${v})` }} />
        ))}
        Plus
      </div>
    </div>
  );
}
