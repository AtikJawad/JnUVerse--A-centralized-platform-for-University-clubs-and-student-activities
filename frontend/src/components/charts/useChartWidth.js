import { useEffect, useState } from "react";

/**
 * Measures a container's width so SVG charts draw at real pixel size (text stays 11px instead of
 * being scaled down by a fixed viewBox). Falls back to `initial` before the first measurement.
 */
export default function useChartWidth(ref, initial = 480) {
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
