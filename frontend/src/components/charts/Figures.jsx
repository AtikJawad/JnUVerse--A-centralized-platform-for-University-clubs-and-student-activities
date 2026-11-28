import { useRef, useState } from "react";
import { ChartTooltip } from "./ChartFrame";
import { TEXT_PRIMARY, TEXT_SECONDARY } from "./chartTheme";

/**
 * MetricRow — Week 8 Stage 3
 * Stitch operator-dashboard hairline metric row (label · value · note · caption). Values use
 * proportional figures (no tabular-nums at display size).
 *
 * @param {Array<{label: string, value: string, note?: string, caption?: string}>} items
 */
export function MetricRow({ items }) {
  return (
    <div
      className={`grid grid-cols-2 ${items.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"} divide-x divide-y md:divide-y-0 divide-slate-200/60 bg-surface-white border border-slate-200/60 rounded-xl overflow-hidden`}
    >
      {items.map((m) => (
        <div key={m.label} className="px-5 py-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{m.label}</span>
          <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
            <span className="text-2xl font-bold tracking-tight whitespace-nowrap" style={{ color: TEXT_PRIMARY }}>
              {m.value}
            </span>
            {m.note && <span className="text-[11px] font-medium text-slate-400">{m.note}</span>}
          </div>
          {m.caption && <span className="text-[12px] text-slate-400">{m.caption}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * HeroFigure — the single number a view leads with (≥ 48px, same sans as everything else).
 */
export function HeroFigure({ label, value, caption }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>
        {label}
      </span>
      <span className="text-[56px] leading-[60px] font-extrabold tracking-tight" style={{ color: TEXT_PRIMARY }}>
        {value}
      </span>
      {caption && (
        <span className="text-[13px]" style={{ color: TEXT_SECONDARY }}>
          {caption}
        </span>
      )}
    </div>
  );
}

/**
 * SegmentedBar (tall) — one whole split into ≤ 6 parts.
 * 28px tall, each part its own block with 4px corners and a 2px surface gap; the part's amount is
 * printed inside only when the block is wide enough (white text on these fills); a legend always
 * names the parts; hover and keyboard focus show name, amount and share.
 *
 * @param {Array<{key: string, label: string, value: number, color: string}>} parts
 * @param {string} ariaLabel
 */
export function SegmentedBar({ parts, ariaLabel }) {
  const containerRef = useRef(null);
  const [tip, setTip] = useState(null);
  const total = parts.reduce((sum, p) => sum + (p.value || 0), 0);
  const visible = parts.filter((p) => p.value > 0);

  const show = (e, p) => {
    const box = containerRef.current?.getBoundingClientRect();
    const target = e.currentTarget.getBoundingClientRect();
    if (!box) return;
    setTip({
      x: target.left - box.left + target.width / 2,
      y: target.top - box.top,
      title: p.label,
      rows: [{ label: `${Math.round((p.value / total) * 100)}% of the total`, value: String(p.value) }],
    });
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-3" onPointerLeave={() => setTip(null)}>
      {total === 0 ? (
        <div className="h-7 rounded bg-slate-100" aria-label={`${ariaLabel}: nothing yet`} role="img" />
      ) : (
        <div className="flex h-7 gap-[2px]" role="group" aria-label={ariaLabel}>
          {visible.map((p) => {
            const share = (p.value / total) * 100;
            return (
              <div
                key={p.key}
                tabIndex={0}
                aria-label={`${p.label}: ${p.value} (${Math.round(share)}%)`}
                onPointerEnter={(e) => show(e, p)}
                onFocus={(e) => show(e, p)}
                onBlur={() => setTip(null)}
                className="h-full rounded-[4px] flex items-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/40 hover:opacity-90"
                style={{ width: `${share}%`, backgroundColor: p.color }}
              >
                {share >= 14 && <span className="text-[11px] font-bold text-white">{p.value}</span>}
              </div>
            );
          })}
        </div>
      )}
      <ul className="flex flex-wrap gap-4" aria-label="Legend">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5 text-[12px]" style={{ color: TEXT_SECONDARY }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.label}
          </li>
        ))}
      </ul>
      <ChartTooltip tip={tip} />
    </div>
  );
}
