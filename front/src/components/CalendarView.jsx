import { useMemo } from "react";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function dateKey(d) { return d.toISOString().slice(0, 10); }

export default function CalendarView({ trips }) {
  const counts = useMemo(() => {
    const map = {};
    for (const t of trips) {
      map[t.date] = (map[t.date] || 0) + 1;
    }
    return map;
  }, [trips]);

  const cells = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const arr = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const max = Math.max(1, ...Object.values(counts));

  // Pad to start with Monday alignment
  const firstDay = cells[0].getDay();
  const padStart = (firstDay + 6) % 7; // Monday-based

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
        {cells.map((d) => {
          const k = dateKey(d);
          const n = counts[k] || 0;
          const intensity = n === 0 ? 0 : 0.15 + (n / max) * 0.85;
          const isToday = k === dateKey(new Date());
          return (
            <div
              key={k}
              data-testid={`cal-cell-${k}`}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-center border border-slate-100"
              style={{
                background: n === 0 ? "#F8FAFC" : `rgba(16,185,129,${intensity})`,
                color: n > 0 && intensity > 0.5 ? "white" : "#0F172A",
                outline: isToday ? "2px solid #0A2540" : "none",
              }}
            >
              <div className="text-[11px] opacity-70">{d.toLocaleDateString("fr-FR", { day: "numeric" })}</div>
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
