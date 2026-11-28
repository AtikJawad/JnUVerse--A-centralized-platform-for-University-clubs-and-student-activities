import { useRef, useState } from "react";
import { ChartTooltip } from "./ChartFrame";
import { GRID, SERIES, TEXT_PRIMARY, TEXT_SECONDARY, niceTicks } from "./chartTheme";
import useChartWidth from "./useChartWidth";

const H = 220;
const PAD = { top: 20, right: 8, bottom: 28, left: 36 };

/** Column path: square at the baseline, 4px rounded data end (top). */
function columnPath(x, y, w, h) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * ColumnChart — Week 8 Stage 3
 *
 * Vertical columns on one baseline (e.g. rating distribution 1★–5★). Columns ≤ 24px wide, value on
 * the cap, hairline solid gridlines at clean ticks, per-column hover/focus tooltip with a hit area
 * covering the whole band. Pass `colors` for an ordinal ramp; otherwise every column uses slot 1.
 *
 * @param {Array<{key: string, label: string, value: number, display?: string, detail?: string}>} data
 * @param {string[]} [colors] - One color per column (ordinal ramp), same order as data
 * @param {string} valueLabel - Name of the measure (tooltip and aria)
 * @param {string} ariaLabel - Chart summary for screen readers
 */
export default function ColumnChart({ data, colors, valueLabel, ariaLabel }) {
  const containerRef = useRef(null);
  const [tip, setTip] = useState(null);
  const [active, setActive] = useState(null);
  const W = useChartWidth(containerRef);

  const ticks = niceTicks(Math.max(...data.map((d) => d.value || 0), 1));
  const top = ticks[ticks.length - 1];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / Math.max(data.length, 1);
  const colW = Math.min(24, band * 0.5);
  const yOf = (v) => PAD.top + plotH - (v / top) * plotH;

  const show = (e, d) => {
    const box = containerRef.current?.getBoundingClientRect();
    const target = e.currentTarget.getBoundingClientRect();
    if (!box) return;
    setActive(d.key);
    setTip({
      x: target.left - box.left + target.width / 2,
      y: target.top - box.top + 12,
      title: d.label,
      rows: [{ label: valueLabel, value: d.display ?? String(d.value) }, ...(d.detail ? [{ label: d.detail, value: "" }] : [])],
    });
  };
  const hide = () => {
    setTip(null);
    setActive(null);
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-x-clip" onPointerLeave={hide}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.left - 8} y={yOf(t) + 4} textAnchor="end" fontSize="11" fill={TEXT_SECONDARY} style={{ fontVariantNumeric: "tabular-nums" }}>
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const h = ((d.value || 0) / top) * plotH;
          const color = colors?.[i] || SERIES[0];
          return (
            <g
              key={d.key}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${d.display ?? d.value} ${valueLabel}`}
              onPointerEnter={(e) => show(e, d)}
              onFocus={(e) => show(e, d)}
              onBlur={hide}
              className="outline-none"
            >
              {/* Hit area: the whole band, bigger than the mark */}
              <rect x={cx - band / 2} y={PAD.top} width={band} height={plotH} fill="transparent" />
              {active === d.key && (
                <rect x={cx - band / 2 + 2} y={PAD.top} width={band - 4} height={plotH} fill={GRID} opacity="0.35" rx="4" />
              )}
              <path d={columnPath(cx - colW / 2, yOf(d.value || 0), colW, h)} fill={color} />
              <text x={cx} y={yOf(d.value || 0) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={TEXT_PRIMARY}>
                {d.display ?? d.value}
              </text>
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXT_SECONDARY}>
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={GRID} strokeWidth="1" />
      </svg>
      <ChartTooltip tip={tip} />
    </div>
  );
}
