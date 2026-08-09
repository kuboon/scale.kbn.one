import { ScaleMeta } from "./types.ts";

/** Headroom above maxExponent so the largest entry stays reachable when zoomed out */
const TOP_HEADROOM = 0.5;

/** The vertical axis is linear; only the span it covers is logarithmic. */
export interface ViewportState {
  spanExp: number; // log₁₀ of the visible span — the zoom level
  span: number; // 10 ** spanExp
  bottom: number; // value at the bottom edge
  top: number; // value at the top edge
}

/** Highest value any viewport may reach */
export function topValue(meta: ScaleMeta): number {
  return 10 ** (meta.maxExponent + TOP_HEADROOM);
}

export function clampSpanExp(spanExp: number, meta: ScaleMeta): number {
  return Math.max(meta.minExponent, Math.min(meta.maxExponent + TOP_HEADROOM, spanExp));
}

/** Keep the window inside [0, topValue]. The bottom edge doubles as the zoom anchor. */
export function clampBottom(bottom: number, span: number, meta: ScaleMeta): number {
  return Math.max(0, Math.min(topValue(meta) - span, bottom));
}

export function getViewport(spanExp: number, bottom: number): ViewportState {
  const span = 10 ** spanExp;
  return { spanExp, span, bottom, top: bottom + span };
}

/** Map a value to a fraction (0=top, 1=bottom) — large values sit at the top */
export function valueToFraction(value: number, vp: ViewportState): number {
  return 1 - (value - vp.bottom) / vp.span;
}

/** Map a fraction (0=left/top, 1=right/bottom) back to a value */
export function fractionToValue(fraction: number, vp: ViewportState): number {
  return vp.bottom + fraction * vp.span;
}

export function hueForExponent(spanExp: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  const raw = (spanExp - meta.minExponent) / range;
  const progress = Math.max(0, Math.min(1, raw));
  return 270 - progress * 240;
}

/**
 * Position on the fixed overview bar (0=top, 1=bottom), which always spans the
 * whole scale.
 *
 * Linear, to match the detail axis. A mapping that stretches the low end (log,
 * or any root) also stretches motion down there: nudging `bottom` off zero by a
 * thousandth of the range would throw the marker a third of the way up the bar.
 * Linear is the only mapping where the marker moves in proportion to the swipe.
 */
export function overviewFraction(value: number, meta: ScaleMeta): number {
  const progress = value / topValue(meta);
  return 1 - Math.max(0, Math.min(1, progress));
}

/** Pick a round step (1, 2 or 5 × 10ⁿ) that yields roughly `count` graduations */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || count < 1) return 0;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

/** Linear graduations inside the viewport, snapped to a round step */
export function computeTicks(vp: ViewportState, count: number): number[] {
  const step = niceStep(vp.span, count);
  if (!(step > 0)) return [];

  const first = Math.ceil(vp.bottom / step);
  const last = Math.floor(vp.top / step);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last - first > 1000) return [];

  const ticks: number[] = [];
  for (let i = first; i <= last; i++) {
    // Multiplying accumulates float noise (0.2 × 3 = 0.6000000000000001)
    ticks.push(+(i * step).toPrecision(12));
  }
  return ticks;
}

/**
 * Bottom edge that keeps the value sitting at `fraction` (0=top, 1=bottom) pinned
 * in place while the span changes — i.e. zoom anchored under the pointer.
 */
export function zoomAnchoredBottom(
  vp: ViewportState,
  nextSpan: number,
  fraction: number,
): number {
  const distanceFromBottom = 1 - fraction;
  const anchorValue = vp.bottom + distanceFromBottom * vp.span;
  return anchorValue - distanceFromBottom * nextSpan;
}
