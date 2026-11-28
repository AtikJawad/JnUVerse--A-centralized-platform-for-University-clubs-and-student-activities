import { useRef, useState } from "react";
import { ChartTooltip } from "./ChartFrame";
import { DEEMPHASIS, GRID, SERIES, TEXT_PRIMARY, TEXT_SECONDARY } from "./chartTheme";

/**
 * BarChart (horizontal, ranked) — Week 8 Stage 3
 *
 * One series → one hue (slot 1) for every bar; with `emphasis`, highlighted rows keep slot 1 and the
 * rest use the de-emphasis gray. Bars are 16px (≤ 24px cap), square at the baseline with a 4px rounded
 * data end, value at the tip in text tokens. Every bar is keyboard-focusable and shows a tooltip.
 *
 * @param {Array<{key: string, label: string, value: number, display?: string, highlight?: boolean, detail?: string}>} data
 * @param {number} [max] - Scale maximum (defaults to the largest value; 100 for percentages)
 * @param {(v: number) => string} [format] - Value formatter for labels and tooltips
 * @param {boolean} [emphasis] - Highlight rows with `highlight: true`, gray the others
 * @param {string} valueLabel - Name of the measure (tooltip and aria)
 */
export default function BarChart({ data, max, format = (v) => String(v), emphasis = false, valueLabel }) {
  const containerRef = useRef(null);
  const [tip, setTip] = useState(null);
  const scaleMax = Math.max(max ?? 0, ...data.map((d) => d.value || 0), 1);

  const show = (e, d) => {
    const box = containerRef.current?.getBoundingClientRect();
    const target = e.currentTarget.getBoundingClientRect();
    if (!box) return;
    setTip({
      x: target.left - box.left + target.width / 2,
      y: target.top - box.top,
      title: d.label,
      rows: [
        { label: valueLabel, value: d.display ?? format(d.value) },
        ...(d.detail ? [{ label: d.detail, value: "" }] : []),
      ],
    });
  };

  if (data.length === 0) {
    return <p className="text-[12px] py-6 text-center" style={{ color: TEXT_SECONDARY }}>No data to chart.</p>;
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2.5" onPointerLeave={() => setTip(null)}>
      {data.map((d) => {
        const pct = Math.max(0, Math.min(100, ((d.value || 0) / scaleMax) * 100));
        const color = emphasis && !d.highlight ? DEEMPHASIS : SERIES[0];
        return (
          <div key={d.key} className="grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[minmax(0,12rem)_1fr] items-center gap-3">
            <span
              className={`text-[12px] truncate ${d.highlight ? "font-semibold" : ""}`}
              style={{ color: d.highlight ? TEXT_PRIMARY : TEXT_SECONDARY }}
              title={d.label}
            >
              {d.label}
            </span>
            <div
              className="flex items-center gap-2 min-w-0 outline-none focus-visible:bg-surface-lavender/60 py-1"
              style={{ borderLeft: `1px solid ${GRID}` }}
              tabIndex={0}
              aria-label={`${d.label}: ${d.display ?? format(d.value)} ${valueLabel}`}
              onPointerEnter={(e) => show(e, d)}
              onFocus={(e) => show(e, d)}
              onBlur={() => setTip(null)}
            >
              <div
                className="h-4 rounded-r-[4px] transition-opacity hover:opacity-85"
                style={{ width: `${pct}%`, minWidth: d.value > 0 ? 2 : 0, backgroundColor: color }}
              />
              <span className="text-[12px] font-semibold tabular-nums shrink-0" style={{ color: TEXT_PRIMARY }}>
                {d.display ?? format(d.value)}
              </span>
            </div>
          </div>
        );
      })}
      <ChartTooltip tip={tip} />
    </div>
  );
}
