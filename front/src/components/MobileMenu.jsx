import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Info, Menu, Moon, Search, Sun } from "lucide-react";
import { APP_VIEW, navigateToView } from "@/lib/appView";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { view: APP_VIEW.SEARCH, label: "Recherche", icon: Search, testId: "nav-search" },
  { view: APP_VIEW.ABOUT, label: "À propos", icon: Info, testId: "nav-about" },
];

const ITEM = "w-full min-h-11 flex items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800";

/** Menu de l'en-tête mobile : navigation, thème et synchronisation (`children`). */
export default function MobileMenu({ activeView, dark, onToggleTheme, syncOk, children }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  const close = useCallback((reason) => {
    setOpen(false);
    if (reason === "escape") buttonRef.current?.focus();
  }, []);
  useDismiss(open, close, wrapRef);
  useEffect(() => {
    if (open) panelRef.current?.querySelector("button")?.focus();
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="relative h-11 w-11 flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        data-testid="mobile-menu-btn"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-2.5 right-2.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-900",
            syncOk ? "bg-emerald-500" : "bg-amber-500"
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl text-slate-800 dark:text-slate-100"
          data-testid="mobile-menu"
        >
          {NAV_ITEMS.map(({ view, label, icon: Icon, testId }) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                setOpen(false);
                navigateToView(view);
              }}
              aria-current={activeView === view ? "page" : undefined}
              className={cn(ITEM, activeView === view && "bg-slate-100 dark:bg-slate-800")}
              data-testid={testId}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
          <button type="button" onClick={onToggleTheme} className={ITEM} data-testid="theme-toggle">
            {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {dark ? "Activer le mode jour" : "Activer le mode nuit"}
          </button>
          <div className="mt-2 border-t border-slate-200 dark:border-slate-700 px-1 pt-3 pb-1">{children}</div>
        </div>
      )}
    </div>
  );
}
