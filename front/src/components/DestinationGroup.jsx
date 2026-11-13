import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, EyeOff, MoreVertical } from "lucide-react";
import TrainCard from "@/components/TrainCard";
import ConnectedTripCard from "@/components/ConnectedTripCard";
import NewBadge from "@/components/NewBadge";
import {
  formatTripDayLabel,
  getParisClock,
  groupDestinationItemsByDate,
  countNewItems,
  groupHasDepartureToday,
  nextDepartureLabel,
} from "@/lib/tripTime";
import { journeyKey, tripKey } from "@/lib/tripKeys";
import { useDismiss } from "@/hooks/useDismiss";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/lib/utils";

function shortDayLabel(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function DayHeader({ date, today, itemCount, isDesktop }) {
  return (
    <div
      className="-mx-5 sticky top-16 z-30 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-slate-200 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-5 py-2"
      data-testid={`day-header-${date}`}
    >
      <h4 className="text-xs font-bold uppercase tracking-[0.06em] text-slate-800 dark:text-slate-100">
        {isDesktop ? formatTripDayLabel(date) : shortDayLabel(date)}
      </h4>
      {date === today && (
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-400">
          Aujourd&apos;hui
        </span>
      )}
      <span className="ml-auto text-xs text-slate-500 tabular-nums">
        {itemCount} trajet{itemCount > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function DestinationMenu({ city, onHide }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRef = useRef(null);
  const menuId = useId();

  const close = useCallback((reason) => {
    setOpen(false);
    if (reason === "escape") buttonRef.current?.focus();
  }, []);
  useDismiss(open, close, wrapRef);
  useEffect(() => {
    if (open) itemRef.current?.focus();
  }, [open]);

  return (
    <div ref={wrapRef} className="absolute inset-y-0 right-0 w-12 flex items-center justify-center border-l border-slate-200 dark:border-slate-700">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Options pour ${city}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="h-11 w-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
        data-testid={`group-menu-${city}`}
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Options pour ${city}`}
          className="absolute right-1 top-full mt-1 z-40 min-w-[13rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl"
        >
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onHide(city);
            }}
            className="w-full min-h-11 flex items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none"
            data-testid={`hide-${city}`}
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Masquer {city}
          </button>
        </div>
      )}
    </div>
  );
}

function DestinationGroup({ group, onHide }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const panelId = useId();
  const connected = group.connected_trips || [];
  const today = getParisClock().today;
  const hasTodayDeparture = groupHasDepartureToday(group.trips, connected);
  const newCount = countNewItems(group.trips, connected);
  const nextDeparture = nextDepartureLabel(group.trips, connected, today);
  const daySections = open ? groupDestinationItemsByDate(group.trips, connected) : [];
  const Chevron = open ? ChevronUp : ChevronDown;

  const todayBadge = hasTodayDeparture && (
    <span
      className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#10B981]/10 text-emerald-700 border-[#10B981]/30 filter-accent-highlight"
      data-testid={`today-badge-${group.destination_city}`}
      title="Au moins un train part aujourd'hui vers cette destination"
    >
      {isDesktop ? "Départ possible aujourd’hui" : "Aujourd’hui"}
    </span>
  );
  const nextLine = nextDeparture && (
    <span className="block text-sm text-slate-700 dark:text-slate-200" data-testid={`next-departure-${group.destination_city}`}>
      Prochain <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{nextDeparture}</span>
    </span>
  );

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl"
      data-testid={`destination-group-${group.destination_city}`}
    >
      {/* Deux boutons frères (et non imbriqués) : ouvrir le groupe / menu de la destination. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            "w-full flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left rounded-2xl pr-14",
            isDesktop ? "p-5" : "py-3.5 pl-4"
          )}
          data-testid={`group-toggle-${group.destination_city}`}
        >
          {isDesktop ? (
            <span className="flex items-center gap-3 min-w-0">
              <span className="h-10 w-10 rounded-xl bg-[#0A2540]/5 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-[#0A2540] dark:text-slate-200" strokeWidth={2.25} />
              </span>
              <span className="block min-w-0">
                <span className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                    {group.destination_city}
                  </span>
                  {todayBadge}
                  {newCount > 0 && <NewBadge count={newCount} className="rounded-full py-0.5" />}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                  {group.destinations.length > 1 ? `${group.destinations.length} gares · ` : ""}
                  <span className="font-mono">{group.trip_count}</span> trajet
                  {group.trip_count > 1 ? "s" : ""} à 0€
                </span>
                {nextLine}
              </span>
            </span>
          ) : (
            <span className="block min-w-0">
              <span className="flex items-baseline gap-2 min-w-0">
                <span
                  className="text-[19px] font-bold text-slate-900 dark:text-slate-100 truncate"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {group.destination_city}
                </span>
                <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                  {group.trip_count} trajet{group.trip_count > 1 ? "s" : ""}
                </span>
              </span>
              {nextLine}
              {(hasTodayDeparture || newCount > 0) && (
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {todayBadge}
                  {newCount > 0 && <NewBadge count={newCount} className="rounded-full py-0.5" />}
                </span>
              )}
            </span>
          )}
          <Chevron className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <DestinationMenu city={group.destination_city} onHide={onHide} />
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
                <DayHeader date={day.date} today={today} itemCount={day.items.length} isDesktop={isDesktop} />
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
