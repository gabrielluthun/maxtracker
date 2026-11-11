import { memo, useId, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, EyeOff } from "lucide-react";
import TrainCard from "@/components/TrainCard";
import ConnectedTripCard from "@/components/ConnectedTripCard";
import NewBadge from "@/components/NewBadge";
import {
  formatTripDayLabel,
  getParisClock,
  groupDestinationItemsByDate,
  countNewItems,
  groupHasDepartureToday,
} from "@/lib/tripTime";
import { journeyKey, tripKey } from "@/lib/tripKeys";

function DayHeader({ date, today, itemCount }) {
  return (
    <div
      className="-mx-5 sticky top-16 z-30 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-slate-200 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-5 py-3"
      data-testid={`day-header-${date}`}
    >
      <h4 className="font-semibold text-base uppercase tracking-[0.14em] text-slate-800 dark:text-slate-100">
        {formatTripDayLabel(date)}
      </h4>
      {date === today && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
          Aujourd&apos;hui
        </span>
      )}
      <span className="ml-auto text-xs text-slate-500 tabular-nums">
        {itemCount} trajet{itemCount > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function DestinationGroup({ group, onHide }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const connected = group.connected_trips || [];
  const today = getParisClock().today;
  const hasTodayDeparture = groupHasDepartureToday(group.trips, connected);
  const newCount = countNewItems(group.trips, connected);
  const daySections = open ? groupDestinationItemsByDate(group.trips, connected) : [];

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl"
      data-testid={`destination-group-${group.destination_city}`}
    >
      {/* Deux boutons frères (et non imbriqués) : ouvrir le groupe / masquer la destination. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left rounded-2xl"
          data-testid={`group-toggle-${group.destination_city}`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-[#0A2540]/5 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-[#0A2540] dark:text-slate-200" strokeWidth={2.25} />
            </span>
            <span className="block min-w-0">
              <span className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                  {group.destination_city}
                </span>
                {hasTodayDeparture && (
                  <span
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 filter-accent-highlight"
                    data-testid={`today-badge-${group.destination_city}`}
                    title="Au moins un train part aujourd'hui vers cette destination"
                  >
                    Départ possible aujourd&apos;hui
                  </span>
                )}
                {newCount > 0 && <NewBadge count={newCount} className="rounded-full py-0.5" />}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                {group.destinations.length > 1 ? `${group.destinations.length} gares · ` : ""}
                <span className="font-mono">{group.trip_count}</span> trajet
                {group.trip_count > 1 ? "s" : ""} à 0€
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {/* Réserve la place du bouton « masquer », posé par-dessus. */}
            <span className="h-8 w-8" aria-hidden="true" />
            {open ? (
              <ChevronUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onHide(group.destination_city)}
          className="absolute top-1/2 -translate-y-1/2 right-12 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title="Masquer cette destination"
          aria-label={`Masquer la destination ${group.destination_city}`}
          data-testid={`hide-${group.destination_city}`}
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div id={panelId} className="px-5 pb-5">
          {group.destinations.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {group.destinations.map((d) => (
                <span
                  key={d}
                  className="text-[11px] uppercase tracking-wider font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-2.5 py-1"
                >
                  {d}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-5">
            {daySections.map((day) => (
              <section key={day.date} data-testid={`day-section-${day.date}`}>
                <DayHeader date={day.date} today={today} itemCount={day.items.length} />
                <div className="space-y-3 pt-3">
                  {day.items.map((item) =>
                    item.kind === "direct" ? (
                      <TrainCard key={tripKey(item.trip)} trip={item.trip} />
                    ) : (
                      <ConnectedTripCard key={journeyKey(item.connected)} connected={item.connected} />
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(
  DestinationGroup,
  (prev, next) => prev.group === next.group && prev.onHide === next.onHide
);
