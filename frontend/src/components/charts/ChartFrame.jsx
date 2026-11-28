import { useState } from "react";
import { TEXT_PRIMARY, TEXT_SECONDARY } from "./chartTheme";

/**
 * ChartFrame — Week 8 Stage 3
 *
 * Card around every chart: title, optional subtitle, a "Chart / Table" switch (the table view is the
 * accessible twin every chart must have), and an optional legend. Styled like the Stitch operator
 * dashboard cards (white surface, hairline border, rounded-xl).
 *
 * @param {string} title
 * @param {string} [subtitle]
 * @param {Array<{label: string, color: string, shape?: "rect"|"line"}>} [legend] - shown for ≥ 2 series
 * @param {{ columns: Array<{key: string, label: string, align?: "left"|"right"}>, rows: Array<Object> }} table
 * @param {React.ReactNode} children - the chart
 */
export default function ChartFrame({ title, subtitle, legend, table, children }) {
  const [view, setView] = useState("chart");

  return (
    <section className="bg-surface-white border border-slate-200/60 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px]" style={{ color: TEXT_SECONDARY }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="inline-flex p-0.5 rounded-lg bg-slate-100" role="group" aria-label={`${title} view`}>
          {["chart", "table"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                view === v ? "bg-surface-white text-on-surface shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {legend && legend.length >= 2 && view === "chart" && (
        <ul className="flex flex-wrap items-center gap-4" aria-label="Legend">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-[12px]" style={{ color: TEXT_SECONDARY }}>
              {item.shape === "line" ? (
                <span className="w-3.5 h-0.5 rounded-full" style={{ backgroundColor: item.color }} />
              ) : (
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              )}
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {view === "chart" ? (
        children
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                {table.columns.map((c) => (
                  <th key={c.key} scope="col" className={`py-2 px-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((row, i) => (
                <tr key={i}>
                  {table.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`py-2 px-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                      style={{ color: TEXT_PRIMARY }}
                    >
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Tooltip shown on hover and keyboard focus. Value leads (strong), label follows (secondary).
 * Content is rendered as React text (never HTML), so labels from the API are safe.
 */
export function ChartTooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg bg-surface-white border border-slate-200 shadow-[0_16px_36px_-4px_rgba(43,52,185,0.08),0_6px_12px_-2px_rgba(19,21,38,0.02)] text-[12px] whitespace-nowrap"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.title && (
        <div className="text-[11px] mb-1" style={{ color: TEXT_SECONDARY }}>
          {tip.title}
        </div>
      )}
      {tip.rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          {r.color && <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: r.color }} />}
          <span className="font-semibold tabular-nums" style={{ color: TEXT_PRIMARY }}>
            {r.value}
          </span>
          <span style={{ color: TEXT_SECONDARY }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
