import { useEffect } from "react";

/** Ferme un menu ouvert sur Échap (`onClose("escape")`) ou sur un appui hors de `ref` (`onClose("outside")`). */
export function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose("escape");
    };
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose("outside");
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, onClose, ref]);
}
