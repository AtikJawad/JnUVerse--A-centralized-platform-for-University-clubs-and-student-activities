/**
 * Chart theme — Week 8 Stage 3
 *
 * JnUVerse instance of the data-viz method's parameters. Every color below was checked with the
 * dataviz palette validator (light mode, surface #FFFFFF) on 2026-11-28:
 *  - categorical "#444ed0,#e8692a,#00a383": all checks PASS (lightness band, chroma floor,
 *    CVD worst adjacent ΔE 11.8, normal-vision floor ΔE 27.0, contrast ≥ 3:1).
 *  - ordinal "#9ea4f4,#8086ec,#6168e0,#444ed0,#2f38bf": PASS (monotone L, adjacent ΔL ≥ 0.06,
 *    light end 2.32:1, single hue).
 * Brand primary-container #2B34B9 is NOT used for marks: it falls below the lightness band (L 0.419).
 * The app has no dark mode, so only the light palette is defined.
 */

// Categorical slots, assigned in fixed order (never cycled)
export const SERIES = ["#444ED0", "#E8692A", "#00A383"];

// Ordinal ramp, light → dark (e.g. rating 1★ → 5★)
export const ORDINAL_5 = ["#9EA4F4", "#8086EC", "#6168E0", "#444ED0", "#2F38BF"];

// Emphasis form: the highlighted item uses SERIES[0], everything else this de-emphasis gray
export const DEEMPHASIS = "#C6C5D6"; // DESIGN.md outline-variant

// Chrome and text tokens (text never wears a series color)
export const SURFACE = "#FFFFFF";
export const GRID = "#E2E4F3"; // DESIGN.md border-subtle — hairline, solid
export const TEXT_PRIMARY = "#181A2C"; // on-surface
export const TEXT_SECONDARY = "#686B7D"; // text-muted

/** Clean axis ticks from 0 to a rounded maximum (whole numbers, ≤ 5 steps). */
export function niceTicks(maxValue, maxSteps = 4, integer = true) {
  const max = Math.max(1, maxValue);
  const rawStep = integer ? Math.max(1, max / maxSteps) : max / maxSteps;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) || magnitude * 10;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
