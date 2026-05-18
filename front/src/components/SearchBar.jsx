import { useEffect, useRef, useState } from "react";
import { Search, ArrowLeftRight, Star, X, MapPin } from "lucide-react";
import { searchStations } from "@/lib/api";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function SearchBar({ origin, onOriginChange, onSearch, loading }) {
  const [query, setQuery] = useState(origin?.name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [favs, setFavs] = useState(getFavorites());
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(origin?.name || ""); }, [origin]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (query.length < 3) { setSuggestions([]); return; }
      const res = await searchStations(query);
      if (!cancelled) setSuggestions(res);
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const pick = (s) => {
    const station = { name: s.name, raw: s.raw, is_metropolis: s.is_metropolis };
    onOriginChange(station);
    setQuery(s.name);
    setOpen(false);
    onSearch(station);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  const fav = origin ? !!favs.find((f) => f.raw === origin.raw) : false;
  const onFav = () => {
    if (!origin) return;
    setFavs(toggleFavorite(origin));
  };

  return (
    <div className="w-full" ref={wrapRef}>
      <div className="bg-white rounded-2xl shadow-[0_24px_60px_-24px_rgba(10,37,64,0.25)] border border-slate-200 p-4 md:p-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Gare de départ
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1 min-w-0 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" strokeWidth={2.25} />
              <input
                data-testid="search-input"
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Tapez 3 lettres (Paris, Lyon, Bordeaux...)"
                className="w-full h-14 pl-12 pr-12 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-[#0A2540] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0A2540]/10 text-lg"
              />
              {origin && (
                <button
                  data-testid="favorite-btn"
                  onClick={onFav}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-amber-50 transition-colors"
                  title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Star className={cn("h-5 w-5", fav ? "fill-amber-400 text-amber-400" : "text-slate-400")} />
                </button>
              )}
            </div>
            {open && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto" data-testid="suggestions-list">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.raw}-${i}`}
                    onClick={() => pick(s)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0",
                      active === i && "bg-slate-50"
                    )}
                    data-testid={`suggestion-${i}`}
                  >
                    <MapPin className="h-4 w-4 text-slate-400" strokeWidth={2} />
                    <span className="flex-1 text-slate-800">{s.name}</span>
                    {s.is_metropolis && (
                      <span className="text-[10px] uppercase tracking-wider bg-[#0A2540] text-white px-2 py-0.5 rounded-full font-semibold">Métropole</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {open && query.length >= 3 && suggestions.length === 0 && (
              <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-sm text-slate-500" data-testid="suggestions-empty">
                Aucune gare trouvée pour « {query} »
              </div>
            )}
          </div>

          <div className="flex flex-row items-center gap-2 shrink-0">
            <button
              data-testid="swap-stations-btn"
              onClick={() => { /* swap is informational - we only do "from" search; provide nudge */ }}
              disabled
              className="flex items-center justify-center h-14 w-14 shrink-0 rounded-full border-2 border-slate-200 bg-white text-slate-300 cursor-not-allowed"
              title="Inversion (saisissez la gare retour)"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </button>
            <button
              data-testid="search-submit-btn"
              onClick={() => origin && onSearch(origin)}
              disabled={!origin || loading}
              className="h-14 w-full sm:w-auto px-8 rounded-xl bg-[#0A2540] hover:bg-[#173A5E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold tracking-wide transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Search className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              {loading ? "Recherche…" : "Trouver les 0€"}
            </button>
          </div>
        </div>

        {favs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap" data-testid="favorites-bar">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Favoris</span>
            {favs.map((f) => (
              <div key={f.raw} className="group flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full pl-3 pr-1 py-1 text-sm">
                <button
                  data-testid={`fav-pick-${f.raw}`}
                  onClick={() => { onOriginChange(f); setQuery(f.name); onSearch(f); }}
                  className="font-medium"
                >
                  {f.name}
                </button>
                <button
                  data-testid={`fav-remove-${f.raw}`}
                  onClick={() => setFavs(toggleFavorite(f))}
                  className="opacity-50 hover:opacity-100 ml-1 p-0.5 rounded-full hover:bg-amber-100"
                  title="Retirer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
