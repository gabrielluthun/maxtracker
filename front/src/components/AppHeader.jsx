import { Train, Search, Info } from "lucide-react";
import { APP_VIEW, navigateToView } from "@/lib/appView";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { view: APP_VIEW.SEARCH, label: "Recherche", icon: Search, testId: "nav-search" },
  { view: APP_VIEW.ABOUT, label: "À propos", icon: Info, testId: "nav-about" },
];

export default function AppHeader({ activeView, trailing = null }) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-slate-200/60" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigateToView(APP_VIEW.SEARCH)}
          className="flex items-center gap-2.5 shrink-0 text-left rounded-lg hover:opacity-90 transition-opacity"
          data-testid="nav-logo"
        >
          <div className="h-9 w-9 rounded-xl bg-[#0A2540] flex items-center justify-center">
            <Train className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight hidden sm:block">
            <div
              className="text-[18px] font-bold text-[#0A2540] tracking-tight"
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
          <div className="inline-flex h-9 items-center rounded-lg bg-slate-100 p-1">
            {NAV_ITEMS.map(({ view, label, icon: Icon, testId }) => {
              const active = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => navigateToView(view)}
                  data-testid={testId}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all",
                    active
                      ? "bg-white text-[#0A2540] shadow-sm"
                      : "text-slate-600 hover:text-[#0A2540]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 flex items-center justify-end min-w-0">{trailing}</div>
      </div>
    </header>
  );
}
