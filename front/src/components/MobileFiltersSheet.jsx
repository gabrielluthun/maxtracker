import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import FiltersPanel from "@/components/FiltersPanel";
import { cn } from "@/lib/utils";

export default function MobileFiltersSheet({
  filters,
  onFiltersChange,
  hiddenCount,
  onResetHidden,
  totalDestinations,
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const openWithPressAnimation = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setBtnPressed(true);
    openTimerRef.current = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => setOpen(true));
      setBtnPressed(false);
      openTimerRef.current = null;
    }, 130);
  };

  const closeSheet = () => {
    setOpen(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, 220);
  };

  return (
    <>
      <button
        type="button"
        onClick={openWithPressAnimation}
        className={cn(
          "lg:hidden fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#0A2540] text-white px-4 py-3 shadow-lg transition-all duration-150 ease-out",
          btnPressed ? "scale-90 shadow-md bg-[#173A5E]" : "scale-100"
        )}
        data-testid="mobile-filters-open-btn"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtres
      </button>

      {mounted && (
        <div className="lg:hidden fixed inset-0 z-50" data-testid="mobile-filters-sheet">
          <button
            type="button"
            aria-label="Fermer les filtres"
            className={cn(
              "absolute inset-0 bg-slate-900/35 transition-opacity duration-200",
              open ? "opacity-100" : "opacity-0"
            )}
            onClick={closeSheet}
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 shadow-2xl transition-transform duration-200 ease-out",
              open ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Filtres</h3>
              <button
                type="button"
                onClick={closeSheet}
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
      )}
    </>
  );
}
