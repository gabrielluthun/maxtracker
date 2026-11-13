import { useEffect, useId, useState } from "react";
import MobileFilters from "@/components/MobileFilters";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { filtersWithDefaults } from "@/lib/urlState";
import { cn } from "@/lib/utils";

/** Feuille de filtres (mobile), ouverte par le bouton Filtres de la barre du bas. */
export default function MobileFiltersSheet({
  open,
  onClose,
  filters,
  onFiltersChange,
  hiddenCount,
  onResetHidden,
  tripCount,
}) {
  // `mounted` garde la feuille dans le DOM le temps de l'animation de fermeture.
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timer);
  }, [open]);

  const titleId = useId();
  const sheetRef = useDialogFocus(mounted, onClose);

  // Pas de défilement de la page derrière la feuille.
  useEffect(() => {
    if (!mounted) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="mobile-filters-sheet">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer les filtres"
        className={cn(
          "absolute inset-0 bg-slate-900/35 transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[90vh] flex flex-col rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out",
          shown ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        <div className="flex items-center px-4 pt-2.5 pb-1.5">
          <h2 id={titleId} className="text-[22px] font-extrabold text-slate-900">Filtres</h2>
          <button
            type="button"
            onClick={() => onFiltersChange(filtersWithDefaults())}
            className="ml-auto min-h-11 px-1 text-sm font-semibold text-slate-500 underline underline-offset-2"
            data-testid="mobile-filters-clear"
          >
            Tout effacer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-5">
          <MobileFilters
            filters={filters}
            onChange={onFiltersChange}
            hiddenCount={hiddenCount}
            onResetHidden={onResetHidden}
          />
        </div>

        <div className="border-t border-slate-200 px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[52px] rounded-2xl bg-[#10B981] dark:bg-emerald-400 text-base font-extrabold text-[#052E1F]"
            data-testid="mobile-filters-apply"
          >
            {tripCount === 0
              ? "Aucun trajet"
              : `Voir ${tripCount.toLocaleString("fr-FR")} trajet${tripCount > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
