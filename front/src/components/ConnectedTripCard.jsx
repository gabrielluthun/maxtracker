import { memo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, GitBranch, Zap } from "lucide-react";
import TrainCard from "@/components/TrainCard";
import { cn } from "@/lib/utils";

const LEG_LABELS = ["1er train", "2e train", "3e train"];

function fmtHHmm(s) {
  return (s || "").slice(0, 5);
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

function ConnectedTripCard({ connected, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`connected-trip-legs-${connected.id}`}
        className={cn(
          "w-full p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
          open && "border-b border-slate-100 dark:border-slate-700"
        )}
        data-testid={`connected-trip-toggle-${connected.id}`}
      >
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
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono text-right">
              {waitLabel} d&apos;attente totale
              {connected.total_duration_minutes > 0 && (
                <span className="text-slate-400 dark:text-slate-500">
                  {" "}
                  · {Math.floor(connected.total_duration_minutes / 60)}h
                  {(connected.total_duration_minutes % 60).toString().padStart(2, "0")} total
                </span>
              )}
            </div>
            {open ? (
              <ChevronUp className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden />
            )}
          </div>
        </div>
      </button>
      {open && (
        <div id={`connected-trip-legs-${connected.id}`} className="p-5 space-y-3">
          {(connected.legs || []).map((leg, i) => (
            <TrainCard
              key={leg.id || i}
              trip={leg}
              label={LEG_LABELS[i] || `${i + 1}e train`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ConnectedTripCard);
