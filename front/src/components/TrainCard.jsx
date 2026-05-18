import { memo } from "react";
import { ExternalLink, Train, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TRAIN_TYPE_STYLES = {
  TGV_INOUI: { ribbon: "bg-[#E11D48]", badge: "bg-[#E11D48] text-white", label: "TGV INOUI" },
  INTERCITES: { ribbon: "bg-[#0284C7]", badge: "bg-[#0284C7] text-white", label: "INTERCITÉS" },
  INTERCITES_NUIT: { ribbon: "bg-[#4F46E5]", badge: "bg-[#4F46E5] text-white", label: "INTERCITÉS DE NUIT" },
};

function fmtHHmm(s) {
  return (s || "").slice(0, 5);
}

function durationStr(dep, arr) {
  if (!dep || !arr) return "";
  const [h1, m1] = dep.split(":").map(Number);
  const [h2, m2] = arr.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function isImminent(date, heure) {
  try {
    const dt = new Date(`${date}T${heure}:00`);
    const diff = dt.getTime() - Date.now();
    return diff > 0 && diff < 4 * 3600 * 1000;
  } catch {
    return false;
  }
}

function formatFare(fareEur) {
  if (fareEur === 0 || fareEur === 0.0) return "0€";
  return `${fareEur.toFixed(2).replace(".", ",")}€`;
}

function TrainCard({ trip }) {
  const style = TRAIN_TYPE_STYLES[trip.train_type] || TRAIN_TYPE_STYLES.TGV_INOUI;
  const imminent = isImminent(trip.date, trip.heure_depart);
  const dateObj = new Date(`${trip.date}T${trip.heure_depart}:00`);
  const dayLabel = dateObj.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const fare = trip.fare_eur ?? 0;

  return (
    <div
      data-testid={`train-card-${trip.id}`}
      className="card-hover bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col sm:flex-row"
    >
      <div className={cn("sm:w-2 h-2 sm:h-auto", style.ribbon)} />

      <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-4 sm:items-center">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">{dayLabel}</div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">{fmtHHmm(trip.heure_depart)}</div>
          <div className="text-sm text-slate-600 mt-0.5 line-clamp-1">{trip.origine}</div>
        </div>

        <div className="hidden sm:flex flex-col items-center justify-center px-2">
          <div className="text-[10px] text-slate-400 mb-1 font-mono">{durationStr(trip.heure_depart, trip.heure_arrivee)}</div>
          <div className="flex items-center gap-1.5">
            <div className="h-px w-10 bg-slate-300" />
            <Train className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            <div className="h-px w-10 bg-slate-300" />
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">N°{trip.train_no}</div>
        </div>

        <div className="sm:text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Arrivée</div>
          <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">{fmtHHmm(trip.heure_arrivee)}</div>
          <div className="text-sm text-slate-600 mt-0.5 line-clamp-1">{trip.destination}</div>
        </div>

        <div className="flex sm:flex-col items-start sm:items-end gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded",
                style.badge
              )}
              data-testid="train-type-badge"
            >
              {style.label}
            </span>
            {imminent && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-[#F59E0B] text-white flex items-center gap-1" data-testid="imminent-badge">
                <Zap className="h-3 w-3" strokeWidth={2.5} /> Imminent
              </span>
            )}
          </div>
          <a
            data-testid="sncf-connect-link"
            href={trip.sncf_connect_url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Réserver sur SNCF Connect : ${trip.origine} → ${trip.destination}, ${dayLabel} à ${fmtHHmm(trip.heure_depart)}`}
            aria-label={`Réserver sur SNCF Connect, ${trip.origine} vers ${trip.destination}, ${dayLabel} à ${fmtHHmm(trip.heure_depart)}`}
            className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg px-4 py-2.5 transition-colors"
          >
            <span className="font-mono">{formatFare(fare)}</span>
            <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default memo(TrainCard);
