import { ScaleMeta } from "./types.ts";

const VIEW_MARGIN = 0.5; // visible range is ±0.5 exponents around center

export interface ViewportState {
  exponent: number;
  rangeMin: number; // linear value at lower bound
  rangeMax: number; // linear value at upper bound
}

function isReversed(_meta: ScaleMeta): boolean {
  return true;
}

/** Get the visible linear range for a given center exponent */
export function getViewport(exponent: number): ViewportState {
  return {
    exponent,
    rangeMin: 10 ** (exponent - VIEW_MARGIN),
    rangeMax: 10 ** (exponent + VIEW_MARGIN),
  };
}

/** Map a linear value to a fraction (0=top, 1=bottom) within the viewport */
export function valueToFraction(value: number, vp: ViewportState, meta: ScaleMeta): number {
  const raw = (value - vp.rangeMin) / (vp.rangeMax - vp.rangeMin);
  // History: top = large values (distant past), bottom = small (present)
  return isReversed(meta) ? 1 - raw : raw;
}

export function hueForExponent(exponent: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  const progress = (exponent - meta.minExponent) / range;
  return 270 - progress * 240;
}

/** Generate nice tick values for a linear range */
export function computeTicks(rangeMin: number, rangeMax: number): number[] {
  const span = rangeMax - rangeMin;
  if (span <= 0) return [];
  const rawStep = span / 6;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const r = rawStep / mag;
  const nice = r <= 1.5 ? 1 : r <= 3.5 ? 2 : r <= 7.5 ? 5 : 10;
  const step = nice * mag;

  const ticks: number[] = [];
  let v = Math.ceil(rangeMin / step) * step;
  while (v <= rangeMax) {
    ticks.push(v);
    v += step;
  }
  return ticks;
}
