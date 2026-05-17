import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export default function SyncBadge({ info, onRefresh, refreshing }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 30000); return () => clearInterval(id); }, []);
  const ok = info?.last_sync_status === "ok";
  return (
    <div className="flex items-center gap-3" data-testid="sync-badge">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
        {ok ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-amber-600" />}
        <div className="text-[11px] leading-tight">
          <div className="font-semibold text-slate-700">Dernière sync</div>
          <div className="text-slate-500 font-mono">{timeAgo(info?.last_sync_at)}</div>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        data-testid="manual-refresh-btn"
        className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
        title="Rafraîchir maintenant"
      >
        <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
