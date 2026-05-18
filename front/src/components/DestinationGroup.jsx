import { memo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, EyeOff } from "lucide-react";
import TrainCard from "@/components/TrainCard";
function DestinationGroup({ group, onHide, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [visibleCount, setVisibleCount] = useState(10);
  const visible = group.trips.slice(0, visibleCount);
  const hasMore = group.trips.length > visibleCount;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid={`destination-group-${group.destination_city}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
        data-testid={`group-toggle-${group.destination_city}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#0A2540]/5 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-[#0A2540]" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-lg text-slate-900 truncate">{group.destination_city}</h3>
            <div className="text-xs text-slate-500 truncate">
              {group.destinations.length > 1 ? `${group.destinations.length} gares · ` : ""}
              <span className="font-mono">{group.trip_count}</span> trajet{group.trip_count > 1 ? "s" : ""} à 0€
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onHide(group.destination_city); }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Masquer cette destination"
            data-testid={`hide-${group.destination_city}`}
          >
            <EyeOff className="h-4 w-4" />
          </button>
          {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {group.destinations.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {group.destinations.map((d) => (
                <span key={d} className="text-[11px] uppercase tracking-wider font-medium bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">
                  {d}
                </span>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {visible.map((t) => <TrainCard key={t.id} trip={t} />)}
          </div>
          {hasMore && (
            <button
              onClick={() => setVisibleCount(visibleCount + 10)}
              className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0A2540] hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
              data-testid={`load-more-${group.destination_city}`}
            >
              Afficher 10 trajets de plus ({group.trips.length - visibleCount} restants)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(
  DestinationGroup,
  (prev, next) => prev.group === next.group && prev.onHide === next.onHide
);
