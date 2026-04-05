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

/** Generate tick values at 2, 4, 6, 8 × 10^n within the visible range */
export function computeTicks(rangeMin: number, rangeMax: number): number[] {
  const expMin = Math.floor(Math.log10(Math.max(rangeMin, 1e-35)));
  const expMax = Math.ceil(Math.log10(Math.max(rangeMax, 1e-35)));
  const multipliers = [2, 4, 6, 8];
  const ticks: number[] = [];
  for (let e = expMin - 1; e <= expMax; e++) {
    for (const m of multipliers) {
      const v = m * 10 ** e;
      if (v >= rangeMin && v <= rangeMax) {
        ticks.push(v);
      }
    }
  }
  return ticks;
}
