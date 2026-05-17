import { CalendarDays, Clock4, Train, Filter, RotateCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const TIME_SLOTS = [
  { id: "morning", label: "Matin", from: 0, to: 12, icon: "☀️" },
  { id: "afternoon", label: "Après-midi", from: 12, to: 18 },
  { id: "evening", label: "Soir", from: 18, to: 24 },
];

export default function FiltersPanel({ filters, onChange, hiddenCount, onResetHidden, totalDestinations }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  return (
    <aside className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24" data-testid="filters-panel">
      <div className="flex items-center gap-2 mb-5">
        <Filter className="h-5 w-5 text-[#0A2540]" strokeWidth={2.5} />
        <h3 className="font-semibold text-lg text-slate-900">Filtres</h3>
      </div>

      <div className="space-y-5">
        {/* Weekend only */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <CalendarDays className="h-4 w-4 text-slate-500" /> Week-end uniquement
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Samedis et dimanches</div>
          </div>
          <Switch
            data-testid="filter-weekend"
            checked={filters.weekendOnly}
            onCheckedChange={(v) => set("weekendOnly", v)}
          />
        </div>

        {/* Time slots */}
        <div>
          <div className="flex items-center gap-2 font-medium text-slate-800 mb-2">
            <Clock4 className="h-4 w-4 text-slate-500" /> Créneaux horaires
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((s) => (
              <button
                key={s.id}
                onClick={() => set("timeSlots", { ...filters.timeSlots, [s.id]: !filters.timeSlots[s.id] })}
                data-testid={`filter-time-${s.id}`}
                className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                  filters.timeSlots[s.id]
                    ? "bg-[#0A2540] text-white border-[#0A2540]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Train type */}
        <div>
          <div className="flex items-center gap-2 font-medium text-slate-800 mb-2">
            <Train className="h-4 w-4 text-slate-500" /> Type de train
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => set("showInoui", !filters.showInoui)}
              data-testid="filter-inoui"
              className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                filters.showInoui ? "bg-[#E11D48] text-white border-[#E11D48]" : "bg-white text-slate-600 border-slate-200"
              }`}
            >TGV INOUI</button>
            <button
              onClick={() => set("showIntercites", !filters.showIntercites)}
              data-testid="filter-intercites"
              className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                filters.showIntercites ? "bg-[#0284C7] text-white border-[#0284C7]" : "bg-white text-slate-600 border-slate-200"
              }`}
            >INTERCITÉS</button>
          </div>
        </div>

        {/* Hide connections (TGVmax data is direct anyway, mostly informational) */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-slate-800">Sans correspondance</div>
            <div className="text-xs text-slate-500 mt-0.5">Trajets directs uniquement</div>
          </div>
          <Switch
            data-testid="filter-direct"
            checked={filters.directOnly}
            onCheckedChange={(v) => set("directOnly", v)}
          />
        </div>

        {/* Hidden destinations */}
        {hiddenCount > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-2">
              {hiddenCount} destination{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""}
            </div>
            <button
              onClick={onResetHidden}
              data-testid="reset-hidden-btn"
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#0A2540] py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" /> Réafficher tout
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 font-mono">
          {totalDestinations} destination{totalDestinations > 1 ? "s" : ""} disponible{totalDestinations > 1 ? "s" : ""}
        </div>
      </div>
    </aside>
  );
}
