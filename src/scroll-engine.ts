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
  const logVal = Math.log10(Math.max(value, 1e-30));
  const logMin = Math.log10(vp.rangeMin);
  const logMax = Math.log10(vp.rangeMax);
  const raw = (logVal - logMin) / (logMax - logMin);
  // History: top = large values (distant past), bottom = small (present)
  return isReversed(meta) ? 1 - raw : raw;
}

export function hueForExponent(exponent: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  const progress = (exponent - meta.minExponent) / range;
  return 270 - progress * 240;
}

/** Generate nice tick values for a logarithmic range (1-2-5 sequence) */
export function computeTicks(rangeMin: number, rangeMax: number): number[] {
  if (rangeMin <= 0 || rangeMax <= rangeMin) return [];
  const logMin = Math.log10(rangeMin);
  const logMax = Math.log10(rangeMax);
  const startExp = Math.floor(logMin);
  const endExp = Math.ceil(logMax);
  const multipliers = [1, 2, 5];
  const ticks: number[] = [];

  for (let exp = startExp; exp <= endExp; exp++) {
    for (const m of multipliers) {
      const val = m * 10 ** exp;
      if (val >= rangeMin && val <= rangeMax) {
        ticks.push(val);
      }
    }
  }
  return ticks;
}
