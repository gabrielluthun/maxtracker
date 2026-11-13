import { Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Gare recherchée dans l'en-tête mobile ; `data-header-pill` y masque le logo (voir AppHeader). */
export default function StationPill({ station, isFavorite, onToggleFavorite, onEdit }) {
  return (
    <div data-header-pill className="flex-1 min-w-0 flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 min-h-11 flex items-center gap-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 text-left"
        data-testid="station-pill"
      >
        <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={2.25} aria-hidden="true" />
        <span className="sr-only">Changer de gare de départ :</span>
        <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{station.name}</span>
        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">Modifier</span>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(station)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        data-testid="favorite-btn"
      >
        <Star className={cn("h-5 w-5", isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-400")} aria-hidden="true" />
      </button>
    </div>
  );
}
