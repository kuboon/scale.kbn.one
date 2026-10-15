/**
 * The fisheye projection: the whole scale on one screen, magnified around a focus.
 *
 * Distance from the focus `focus` (in decades, `d = log − focus`) is normalised by the scale's
 * whole span `S` and bent with the Sarkar–Brown fisheye function
 *
 *     G(x) = (m + 1)·x / (m·|x| + 1)        x = d / S ∈ [−1, 1]
 *
 * and the result is a fraction of the half-screen `A` either side of the reticle. So:
 *
 * - `m = 0` is the plain log axis, the whole scale fitted to the screen.
 * - Larger `m` magnifies around the focus — `A(m + 1)/S` px per decade there — and squeezes
 *   everything else toward the edges. Nothing ever leaves the screen: `|G| ≤ 1` for any `m`.
 * - It is symmetric and smooth through the focus, so a drag feels the same in both directions.
 *
 * Panning moves `focus`; zooming changes `m`. All pure, so the server renders the first frame with
 * it and the tests run it with no browser.
 */

/** The bend: `x ∈ [−1, 1]` to `[−1, 1]`, steeper at 0 as `m` grows. */
export function bend(x: number, m: number): number {
  return ((m + 1) * x) / (m * Math.abs(x) + 1);
}

/** The inverse of {@link bend}. */
export function unbend(g: number, m: number): number {
  return g / (m + 1 - m * Math.abs(g));
}

/** A fisheye view: where the focus is, how strong the lens is, and what it is drawn on. */
export interface Lens {
  /** log₁₀ value at the reticle. */
  focus: number;
  /** Magnification parameter, ≥ 0. */
  m: number;
  /** The scale's whole span, in decades. */
  span: number;
  /** Half the stage height, px. */
  half: number;
}

/** Offset from the reticle, px, positive downward (larger values are higher up). */
export function project(log: number, lens: Lens): number {
  const x = Math.max(-1, Math.min(1, (lens.focus - log) / lens.span));
  return bend(x, lens.m) * lens.half;
}

/** The log value at an offset from the reticle — {@link project} backwards. */
export function unproject(offset: number, lens: Lens): number {
  const g = Math.max(-1, Math.min(1, offset / lens.half));
  return lens.focus - unbend(g, lens.m) * lens.span;
}

/** Pixels per decade at the focus. */
export function focusScale(lens: Lens): number {
  return (lens.half * (lens.m + 1)) / lens.span;
}

/** The `m` that gives `pxPerDecade` at the focus, clamped to `[0, max]`. */
export function lensFor(
  pxPerDecade: number,
  span: number,
  half: number,
  max = 5000,
): number {
  return Math.min(Math.max((pxPerDecade * span) / half - 1, 0), max);
}

/** Pixels per decade at an offset from the focus, for spacing ticks and captions. */
export function localScale(log: number, lens: Lens): number {
  const x = Math.abs((lens.focus - log) / lens.span);
  const denom = lens.m * x + 1;
  return (lens.half * (lens.m + 1)) / (denom * denom) / lens.span;
}
