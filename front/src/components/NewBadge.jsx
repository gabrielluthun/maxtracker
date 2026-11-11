import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const NEW_TRIP_TITLE = "Place apparue dans les dernières 24 h de publications SNCF";

/** Badge « Nouveau » (ou « 3 nouveaux » avec `count`). */
export default function NewBadge({ count = null, className }) {
  const label = count == null ? "Nouveau" : `${count} nouveau${count > 1 ? "x" : ""}`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        "bg-violet-600 text-white dark:bg-violet-500",
        className
      )}
      title={NEW_TRIP_TITLE}
      data-testid="new-badge"
    >
      <Sparkles className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
