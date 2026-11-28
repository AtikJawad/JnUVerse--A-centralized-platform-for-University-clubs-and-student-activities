import { useRef, useState } from "react";
import { ChartTooltip } from "./ChartFrame";
import { GRID, SURFACE, TEXT_PRIMARY, TEXT_SECONDARY, niceTicks } from "./chartTheme";
import useChartWidth from "./useChartWidth";

const H = 240;
const PAD = { top: 16, right: 56, bottom: 28, left: 40 };

/**
 * LineChart — Week 8 Stage 3
 *
 * One y-axis only (never dual-axis): pass series that share a unit. 2px lines with round joins,
 * end dots r=4 with a 2px surface ring, values labelled at the line end (dropped when end labels
 * would collide — the legend and tooltip carry them), hairline solid gridlines, and a crosshair that
 * snaps to the nearest x with one tooltip listing every series. Keyboard: focus the plot and use ←/→.
 *
 * @param {string[]} xLabels - Category labels along x (e.g. months)
 * @param {Array<{key: string, name: string, color: string, values: Array<number|null>}>} series
 * @param {(v: number) => string} [format]
 * @param {string} ariaLabel
 */
export default function LineChart({ xLabels, series, format = (v) => String(v), ariaLabel }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [index, setIndex] = useState(null);
  const W = useChartWidth(containerRef, 560);

  const n = xLabels.length;
  const allValues = series.flatMap((s) => s.values.filter((v) => typeof v === "number"));
  const ticks = niceTicks(Math.max(...allValues, 1));
  const top = ticks[ticks.length - 1];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xOf = (i) => (n <= 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1));
  const yOf = (v) => PAD.top + plotH - (v / top) * plotH;

  // End labels only when they do not collide (≥ 14 units apart)
  const ends = series
    .map((s) => ({ s, v: s.values[n - 1] }))
    .filter((e) => typeof e.v === "number")
    .map((e) => ({ ...e, y: yOf(e.v) }));
  const endLabelsFit = ends.every((a, i) => ends.every((b, j) => i === j || Math.abs(a.y - b.y) >= 14));

  const pickIndex = (clientX) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(xOf(i) - x) < Math.abs(xOf(best) - x)) best = i;
    setIndex(best);
  };

  const tip = (() => {
    if (index === null || !svgRef.current || !containerRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const box = containerRef.current.getBoundingClientRect();
    const scale = rect.width / W;
    return {
      x: rect.left - box.left + xOf(index) * scale,
      y: rect.top - box.top + PAD.top * scale,
      title: xLabels[index],
      rows: series.map((s) => ({
        label: s.name,
        color: s.color,
        value: typeof s.values[index] === "number" ? format(s.values[index]) : "—",
      })),
    };
  })();

  const pathFor = (values) =>
    values
      .map((v, i) => (typeof v === "number" ? `${xOf(i)},${yOf(v)}` : null))
      .reduce((acc, pt, i, arr) => {
        if (!pt) return acc;
        const prevMissing = i === 0 || arr[i - 1] === null;
        return `${acc}${prevMissing ? "M" : "L"}${pt} `;
      }, "");

  return (
    <div ref={containerRef} className="relative w-full overflow-x-clip">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W} height={H} className="block outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={(e) => pickIndex(e.clientX)}
        onPointerLeave={() => setIndex(null)}
        onFocus={() => setIndex((i) => (i === null ? n - 1 : i))}
        onBlur={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, (i ?? n - 1) - 1));
          if (e.key === "ArrowRight") setIndex((i) => Math.min(n - 1, (i ?? 0) + 1));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.left - 8} y={yOf(t) + 4} textAnchor="end" fontSize="11" fill={TEXT_SECONDARY} style={{ fontVariantNumeric: "tabular-nums" }}>
              {t}
            </text>
          </g>
        ))}
        {xLabels.map((label, i) => (
          <text key={label} x={xOf(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXT_SECONDARY}>
            {label}
          </text>
        ))}

        {index !== null && (
          <line x1={xOf(index)} x2={xOf(index)} y1={PAD.top} y2={PAD.top + plotH} stroke={TEXT_SECONDARY} strokeWidth="1" opacity="0.5" />
        )}

        {series.map((s) => (
          <g key={s.key}>
            <path d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) =>
              typeof v === "number" && (i === n - 1 || i === index || n === 1) ? (
                <circle key={i} cx={xOf(i)} cy={yOf(v)} r="4" fill={s.color} stroke={SURFACE} strokeWidth="2" />
              ) : null
            )}
          </g>
        ))}

        {endLabelsFit &&
          ends.map((e) => (
            <text key={e.s.key} x={xOf(n - 1) + 10} y={e.y + 4} fontSize="11" fontWeight="600" fill={TEXT_PRIMARY}>
              {format(e.v)}
            </text>
          ))}
      </svg>
      <ChartTooltip tip={tip} />
    </div>
  );
}
