import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest("[inert]"));
}

/**
 * Comportement clavier d'un dialogue modal :
 * focus placé dans le dialogue à l'ouverture, Tab / Maj+Tab gardés à l'intérieur,
 * Échap pour fermer, focus rendu à l'élément d'origine à la fermeture.
 *
 * Retourne la ref à poser sur le conteneur du dialogue.
 */
export function useDialogFocus(open, onClose, { initialFocusRef } = {}) {
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return undefined;
    const previous = document.activeElement;
    (initialFocusRef?.current ?? focusableIn(container)[0] ?? container).focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusableIn(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open, initialFocusRef]);

  return containerRef;
}
