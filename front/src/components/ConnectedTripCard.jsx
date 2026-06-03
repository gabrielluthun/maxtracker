import { memo } from "react";
import { ArrowRight, ExternalLink, GitBranch, Train, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTripDayLabel } from "@/lib/tripTime";

const TRAIN_TYPE_STYLES = {
  TGV_INOUI: { badge: "bg-[#E11D48] text-white", label: "TGV INOUI" },
  INTERCITES: { badge: "bg-[#0284C7] text-white", label: "INTERCITÉS" },
  INTERCITES_NUIT: { badge: "bg-[#4F46E5] text-white", label: "INTERCITÉS DE NUIT" },
};

const LEG_LABELS = ["1er train", "2e train", "3e train"];

function fmtHHmm(s) {
  return (s || "").slice(0, 5);
}

function formatFare(fareEur) {
  if (fareEur === 0 || fareEur === 0.0) return "0€";
  return `${fareEur.toFixed(2).replace(".", ",")}€`;
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

function LegRow({ leg, label }) {
  const style = TRAIN_TYPE_STYLES[leg.train_type] || TRAIN_TYPE_STYLES.TGV_INOUI;
  const dayLabel = formatTripDayLabel(leg.date);
  const fare = leg.fare_eur ?? 0;

  return (
    <div className="trip-leg-surface">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        {label}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 sm:items-center">
          <div>
            <div className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {fmtHHmm(leg.heure_depart)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{leg.origine}</div>
          </div>
          <div className="hidden sm:flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Train className="h-4 w-4" strokeWidth={1.75} />
            <span className="mx-2 text-[10px] font-mono">N°{leg.train_no}</span>
          </div>
          <div className="sm:text-right">
            <div className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {fmtHHmm(leg.heure_arrivee)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{leg.destination}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded", style.badge)}>
            {style.label}
          </span>
          <a
            href={leg.sncf_connect_url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Réserver le segment : ${leg.origine} → ${leg.destination}`}
            className="inline-flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold rounded-lg px-3 py-2 transition-colors"
            data-testid={`sncf-connect-leg-${leg.id}`}
          >
            <span className="font-mono">{formatFare(fare)}</span>
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        </div>
      </div>
      <div className="sm:hidden text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
        Train N°{leg.train_no} · {dayLabel}
      </div>
    </div>
  );
}

function ConnectedTripCard({ connected }) {
  const imminent = isImminent(connected.date, connected.heure_depart);
  const waitH = Math.floor(connected.connection_minutes / 60);
  const waitM = connected.connection_minutes % 60;
  const waitLabel =
    waitH > 0 ? `${waitH}h${waitM.toString().padStart(2, "0")}` : `${waitM} min`;
  const hubLabel = connected.hub_metropolis || "";
  const connCount = connected.connection_count ?? (connected.legs?.length || 1) - 1;

  return (
    <div
      data-testid={`connected-trip-${connected.id}`}
      className="card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden border-l-4 border-l-[#6366F1] dark:border-l-indigo-400"
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[#6366F1]/10 text-[#4F46E5] border border-[#6366F1]/25 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-400/40"
            data-testid="connection-hub-badge"
          >
            <GitBranch className="h-3 w-3" strokeWidth={2.5} />
            {connCount === 1 ? "Correspondance" : "Correspondances"} · {hubLabel}
          </span>
          {imminent && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-[#F59E0B] text-white flex items-center gap-1">
              <Zap className="h-3 w-3" strokeWidth={2.5} /> Imminent
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Départ
            </span>
            <div className="font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {fmtHHmm(connected.heure_depart)}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600 hidden sm:block" aria-hidden />
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Arrivée
            </span>
            <div className="font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {fmtHHmm(connected.heure_arrivee)}
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-mono">
            {waitLabel} d&apos;attente totale
            {connected.total_duration_minutes > 0 && (
              <span className="text-slate-400 dark:text-slate-500">
                {" "}
                · {Math.floor(connected.total_duration_minutes / 60)}h
                {(connected.total_duration_minutes % 60).toString().padStart(2, "0")} total
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {(connected.legs || []).map((leg, i) => (
          <LegRow key={leg.id || i} leg={leg} label={LEG_LABELS[i] || `${i + 1}e train`} />
        ))}
      </div>
    </div>
  );
}

export default memo(ConnectedTripCard);
