import { useEffect, useState } from "react";

/**
 * ServerStatusNotice — Week 9 Stage 2
 *
 * App-wide, non-blocking notices:
 *  - "Waking up the server…" while any API request has been pending for more than 4 s
 *    (window "api:slow" events from services/api.js; the Render free tier sleeps when idle).
 *  - "You are offline" while the browser reports no network connection.
 */
export default function ServerStatusNotice() {
  const [slowCount, setSlowCount] = useState(0);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  useEffect(() => {
    const onSlow = (e) => setSlowCount(e.detail?.count || 0);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("api:slow", onSlow);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("api:slow", onSlow);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline && slowCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-full bg-surface-white border border-border-subtle shadow-[0_16px_36px_-4px_rgba(43,52,185,0.12)] flex items-center gap-2.5 text-xs font-semibold text-on-surface"
    >
      {offline ? (
        <>
          <span className="material-symbols-outlined text-[18px] text-error">wifi_off</span>
          You are offline. Changes will not be saved until your connection returns.
        </>
      ) : (
        <>
          <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
          Waking up the server — the first request after a quiet period can take up to a minute.
        </>
      )}
    </div>
  );
}
