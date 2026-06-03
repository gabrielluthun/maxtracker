import { useLayoutEffect, useState } from "react";
import { Train, Search, Info, Sun, Moon } from "lucide-react";
import { APP_VIEW, navigateToView } from "@/lib/appView";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { view: APP_VIEW.SEARCH, label: "Recherche", icon: Search, testId: "nav-search" },
  { view: APP_VIEW.ABOUT, label: "À propos", icon: Info, testId: "nav-about" },
];

function initialDark() {
  try {
    const stored = localStorage.getItem("mt_theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function AppHeader({ activeView, trailing = null }) {
  const [dark, setDark] = useState(initialDark);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("mt_theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  return (
    <header
      className="glass sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-700/60"
      data-testid="app-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigateToView(APP_VIEW.SEARCH)}
          className="flex items-center gap-2.5 shrink-0 text-left rounded-lg hover:opacity-90 transition-opacity"
          data-testid="nav-logo"
        >
          <div className="h-9 w-9 rounded-xl bg-[#0A2540] dark:bg-slate-700 flex items-center justify-center">
            <Train className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight hidden sm:block">
            <div
              className="text-[18px] font-bold text-[#0A2540] dark:text-slate-100 tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              MaxTracker
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
              TGV Max · 0€ tracker
            </div>
          </div>
        </button>

        <nav
          className="flex-1 flex justify-center"
          aria-label="Navigation principale"
          data-testid="app-nav"
        >
          <div className="inline-flex h-9 items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {NAV_ITEMS.map(({ view, label, icon: Icon, testId }) => {
              const active = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => navigateToView(view)}
                  data-testid={testId}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  title={label}
                  className={cn(
                    "inline-flex items-center justify-center sm:justify-start gap-1.5 rounded-md p-2 sm:px-3 sm:py-1 text-sm font-medium transition-all",
                    active
                      ? "bg-white dark:bg-slate-700 text-[#0A2540] dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-[#0A2540] dark:hover:text-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 flex items-center justify-end gap-2 min-w-0">
          {trailing}
          <button
            type="button"
            onClick={() => {
              const root = document.documentElement;
              root.classList.add("theme-transition");
              setDark((d) => !d);
              window.setTimeout(() => root.classList.remove("theme-transition"), 450);
            }}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              dark
                ? "bg-[#0B1120] text-amber-300 hover:bg-slate-800"
                : "text-slate-600 hover:bg-slate-100"
            )}
            aria-label={dark ? "Activer le mode jour" : "Activer le mode nuit"}
            data-testid="theme-toggle"
          >
            {dark ? (
              <Sun className="h-5 w-5" strokeWidth={2} aria-hidden />
            ) : (
              <Moon className="h-5 w-5" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
