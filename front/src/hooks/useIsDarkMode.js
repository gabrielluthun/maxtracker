import { useSyncExternalStore } from "react";

// Le thème est porté par la classe `dark` sur <html> (voir AppHeader).
function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

/** Thème sombre actif — pour les couleurs passées en JS (Recharts, styles inline). */
export function useIsDarkMode() {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
