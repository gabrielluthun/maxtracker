import { memo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, EyeOff } from "lucide-react";
import TrainCard from "@/components/TrainCard";
import ConnectedTripCard from "@/components/ConnectedTripCard";
import {
  formatTripDayLabel,
  getParisClock,
  groupDestinationItemsByDate,
  groupHasDepartureToday,
} from "@/lib/tripTime";

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
  const connected = group.connected_trips || [];
  const today = getParisClock().today;
  const hasTodayDeparture = groupHasDepartureToday(group.trips, connected);
  const daySections = open ? groupDestinationItemsByDate(group.trips, connected) : [];

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl"
      data-testid={`destination-group-${group.destination_city}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left rounded-2xl"
        data-testid={`group-toggle-${group.destination_city}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#0A2540]/5 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-[#0A2540] dark:text-slate-200" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                {group.destination_city}
              </h3>
              {hasTodayDeparture && (
                <span
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 filter-accent-highlight"
                  data-testid={`today-badge-${group.destination_city}`}
                  title="Au moins un train part aujourd'hui vers cette destination"
                >
                  Départ possible aujourd&apos;hui
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {group.destinations.length > 1 ? `${group.destinations.length} gares · ` : ""}
              <span className="font-mono">{group.trip_count}</span> trajet
              {group.trip_count > 1 ? "s" : ""} à 0€
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHide(group.destination_city);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Masquer cette destination"
            data-testid={`hide-${group.destination_city}`}
          >
            <EyeOff className="h-4 w-4" />
          </button>
          {open ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
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
                      <TrainCard key={item.trip.id} trip={item.trip} />
                    ) : (
                      <ConnectedTripCard key={item.connected.id} connected={item.connected} />
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
