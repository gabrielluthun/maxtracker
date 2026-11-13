import { useId } from "react";
import { RotateCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DATE_HORIZON_OPTIONS, MAX_DURATION_OPTIONS } from "@/lib/tripTime";
import { isQuickFilterOn, toggleQuickFilter } from "@/lib/quickFilters";
import { cn } from "@/lib/utils";

// Couleurs « actif » en valeurs explicites : index.css réécrit bg-white / text-slate-900 en mode nuit.
const SOLID_ON = "border-transparent bg-slate-900 text-white dark:bg-[#F1F5F9] dark:text-[#0A0F1C]";
const OUTLINE_OFF = "border-slate-200 text-slate-700";
const BUTTON = "min-h-11 rounded-xl border px-2 text-sm font-semibold transition-colors";

const SLOTS = [
  { key: "morning", label: "Matin" },
  { key: "afternoon", label: "Après-midi" },
  { key: "evening", label: "Soir" },
];

const TRAINS = [
  { key: "showInoui", label: "TGV INOUI / OUIGO", color: "bg-[#BE123C]", testId: "filter-inoui" },
  { key: "showIntercites", label: "Intercités", color: "bg-[#0369A1]", testId: "filter-intercites" },
  { key: "showIntercitesNuit", label: "Nuit", color: "bg-[#4338CA]", testId: "filter-intercites-nuit" },
];

function Group({ legend, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-slate-900">{legend}</legend>
      {children}
    </fieldset>
  );
}

/** Contenu à plat de la feuille de filtres mobile, dans l'ordre de la maquette. */
export default function MobileFilters({ filters, onChange, hiddenCount, onResetHidden }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });
  const newId = useId();

  return (
    <div className="space-y-6">
      <label
        htmlFor={newId}
        className="flex items-center justify-between gap-3 rounded-2xl bg-violet-600/10 dark:bg-violet-600/20 p-3.5"
      >
        <span>
          <span className="block font-bold text-violet-900 dark:text-violet-100">Nouveautés uniquement</span>
          <span className="block text-xs text-violet-700 dark:text-violet-300">Places apparues en 24 h</span>
        </span>
        <Switch
          id={newId}
          data-testid="filter-new"
          checked={!!filters.newOnly}
          onCheckedChange={(v) => set("newOnly", v)}
        />
      </label>

      <Group legend="Correspondances">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {[
            [0, "Direct"],
            [1, "1 correspondance"],
          ].map(([value, label]) => {
            const on = (filters.maxConnections ?? 0) === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => set("maxConnections", value)}
                className={cn(
                  "min-h-11 rounded-lg text-sm font-semibold",
                  on ? "bg-[#FFFFFF] text-[#0F172A] shadow-sm dark:bg-[#F1F5F9] dark:text-[#0A0F1C]" : "text-slate-700"
                )}
                data-testid={`filter-connections-${value}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group legend="Quand">
        <div className="flex flex-wrap gap-2">
          {[
            ["today", "Aujourd’hui", "filter-today"],
            ["weekend", "Week-end", "filter-weekend"],
          ].map(([key, label, testId]) => {
            const on = isQuickFilterOn(filters, key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(toggleQuickFilter(filters, key))}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-semibold",
                  on ? "border-emerald-500 bg-emerald-500/15 text-emerald-800" : "border-slate-300 dark:border-slate-600 text-slate-700"
                )}
                data-testid={testId}
              >
                {label}
              </button>
            );
          })}
          {DATE_HORIZON_OPTIONS.map(({ value, testId }) => {
            const on = filters.dateHorizonDays === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => set("dateHorizonDays", value)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-semibold",
                  on ? "border-emerald-500 bg-emerald-500/15 text-emerald-800" : "border-slate-300 dark:border-slate-600 text-slate-700"
                )}
                data-testid={testId}
              >
                {value} jours
              </button>
            );
          })}
        </div>
      </Group>

      <Group legend="Heure de départ">
        <div className="grid grid-cols-3 gap-2">
          {SLOTS.map(({ key, label }) => {
            const on = !!filters.timeSlots?.[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => set("timeSlots", { ...filters.timeSlots, [key]: !on })}
                className={cn(BUTTON, on ? "border-slate-300 dark:border-slate-600 bg-slate-100 text-slate-900" : OUTLINE_OFF)}
                data-testid={`filter-time-${key}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group legend="Durée maximale">
        <div className="grid grid-cols-4 gap-2">
          {MAX_DURATION_OPTIONS.map(({ value, testId }) => {
            const on = (filters.maxDurationMinutes ?? null) === value;
            return (
              <button
                key={String(value)}
                type="button"
                aria-pressed={on}
                onClick={() => set("maxDurationMinutes", value)}
                className={cn(BUTTON, on ? SOLID_ON : OUTLINE_OFF)}
                data-testid={testId}
              >
                {value == null ? "Toutes" : `${value / 60} h`}
              </button>
            );
          })}
        </div>
      </Group>

      <Group legend="Trains">
        <div className="flex flex-wrap gap-2">
          {TRAINS.map(({ key, label, color, testId }) => {
            const on = !!filters[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => set(key, !on)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-bold",
                  on ? cn(color, "border-transparent text-white") : "filter-train-inactive"
                )}
                data-testid={testId}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Group>

      {hiddenCount > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            {hiddenCount} destination{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""}
          </p>
          <button
            type="button"
            onClick={onResetHidden}
            className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            data-testid="reset-hidden-btn"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Réafficher tout
          </button>
        </div>
      )}
    </div>
  );
}
