import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * DialogA11y — Week 9 Stage 4
 *
 * Drop inside any modal panel (`<div role="dialog">…<DialogA11y onClose={…} />…`) to give it standard
 * keyboard behaviour without restructuring the markup:
 *  - moves focus into the dialog when it opens (first focusable control)
 *  - keeps Tab / Shift+Tab inside the dialog
 *  - Escape calls `onClose` (pass the same handler as the Cancel button / backdrop click, so its
 *    "busy" guard still applies)
 *  - returns focus to the element that opened the dialog when it closes
 *
 * @param {() => void} onClose
 */
export default function DialogA11y({ onClose }) {
  const markerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = markerRef.current?.closest('[role="dialog"]');
    if (!dialog) return undefined;
    const opener = document.activeElement;

    const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    const first = focusables()[0];
    (first || dialog).focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      } else if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  return <span ref={markerRef} hidden />;
}
