import { memo } from "react";
import { ArrowUpRight } from "lucide-react";
import NewBadge from "@/components/NewBadge";
import NextDayMark from "@/components/NextDayMark";
import { TRAIN_TYPE_STYLES, fmtHHmm, formatFare } from "@/components/TrainCard";
import {
  arrivalDayOffset,
  formatCountdown,
  formatTripDayLabel,
  isImminentDeparture,
  minutesUntilDeparture,
  tripDurationMinutes,
} from "@/lib/tripTime";
import { tripConnectUrl } from "@/lib/sncfConnect";
import { tripKey } from "@/lib/tripKeys";
import { cn } from "@/lib/utils";

/** Trajet direct en une ligne compacte (mobile). Le bureau garde `TrainCard`. */
function TrainRow({ trip }) {
  const style = TRAIN_TYPE_STYLES[trip.train_type] || TRAIN_TYPE_STYLES.TGV_INOUI;
  const dep = fmtHHmm(trip.heure_depart);
  const arr = fmtHHmm(trip.heure_arrivee);
  const minutes = tripDurationMinutes(trip.heure_depart, trip.heure_arrivee);
  const imminent = isImminentDeparture(trip.date, trip.heure_depart);
  const origine = trip.origine_label || trip.origine;
  const destination = trip.destination_label || trip.destination;
  const bookLabel = `Réserver sur SNCF Connect, ${origine} vers ${destination}, ${formatTripDayLabel(trip.date)} à ${dep}`;

  return (
    <div
      className="flex border-b border-slate-200 dark:border-slate-700 last:border-b-0"
      data-testid={`train-row-${tripKey(trip)}`}
    >
      <div className={cn("w-[3px] shrink-0", style.ribbon)} aria-hidden="true" />
      <div className="flex-1 min-w-0 flex items-center gap-3 py-3 pl-3.5 pr-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            <span className="text-[19px]">{dep}</span>
            <span className="text-slate-400" aria-hidden="true">→</span>
            <span className="text-[19px]">
              {arr}
              <NextDayMark offset={arrivalDayOffset(trip.heure_depart, minutes)} />
            </span>
            {minutes != null && (
              <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {Math.floor(minutes / 60)} h {String(minutes % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="truncate text-sm text-slate-500 dark:text-slate-400">
            {origine} → {destination}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider", style.badge)} title={style.label}>
              {style.short}
            </span>
            {imminent && (
              <span className="rounded bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" data-testid="imminent-badge">
                {formatCountdown(minutesUntilDeparture(trip.date, trip.heure_depart))}
              </span>
            )}
            {trip.is_new && <NewBadge className="py-0.5" />}
          </div>
        </div>
        <a
          href={tripConnectUrl(trip)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={bookLabel}
          title={bookLabel}
          className="shrink-0 min-w-16 min-h-12 inline-flex items-center justify-center gap-1 rounded-xl bg-[#10B981] hover:bg-emerald-400 dark:bg-emerald-400 dark:hover:bg-emerald-300 px-3 font-mono text-base font-bold text-[#052E1F] transition-colors"
          data-testid="sncf-connect-link"
        >
          {formatFare(trip.fare_eur ?? 0)}
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export default memo(TrainRow);
