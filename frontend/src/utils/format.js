/**
 * Report formatters — Week 8
 *
 * The analytics API returns percentages with one decimal (e.g. 66.7) or null when there
 * is nothing to divide by, and ratings from 1 to 5 (or null when unrated).
 */

/** 66.7 → "66.7%", null/undefined → "—" */
export function formatPercent(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
}

/** 4.25 → "4.3", null → "—" */
export function formatRating(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
}

/** Integer counts; null/undefined → "—" */
export function formatCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-US") : "—";
}

/** "2026-11" → "Nov 2026" */
export function formatMonth(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || "";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

/** ISO date-time → "Nov 5, 2026" in Asia/Dhaka */
export function formatDhakaDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
