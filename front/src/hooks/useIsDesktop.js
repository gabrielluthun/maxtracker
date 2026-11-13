import { useSyncExternalStore } from "react";

// Même seuil que le `lg` de Tailwind : en dessous, l'app affiche sa version mobile.
const query = window.matchMedia("(min-width: 1024px)");

function subscribe(onChange) {
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => query.matches, () => true);
}
