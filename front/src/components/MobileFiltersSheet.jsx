import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import FiltersPanel from "@/components/FiltersPanel";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils";

/** Feuille de filtres (mobile), ouverte par le bouton Filtres de la barre du bas. */
export default function MobileFiltersSheet({
  open,
  onClose,
  filters,
  onFiltersChange,
  hiddenCount,
  onResetHidden,
  totalDestinations,
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
          "absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-slate-900 p-4 pb-6 shadow-2xl transition-transform duration-200 ease-out",
          shown ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id={titleId} className="text-base font-bold text-slate-900 dark:text-slate-100">Filtres</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100"
            aria-label="Fermer"
            data-testid="mobile-filters-close-btn"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <FiltersPanel
          filters={filters}
          onChange={onFiltersChange}
          hiddenCount={hiddenCount}
          onResetHidden={onResetHidden}
          totalDestinations={totalDestinations}
          className="sticky top-0 border-none shadow-none rounded-none p-0"
        />
      </div>
    </div>
  );
}
