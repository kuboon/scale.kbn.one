import { ScaleMeta } from './types';

const PIXELS_PER_EXPONENT = 300;

export function totalHeight(meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  return range * PIXELS_PER_EXPONENT + window.innerHeight;
}

export function scrollYToExponent(scrollY: number, meta: ScaleMeta): number {
  const maxScroll = totalHeight(meta) - window.innerHeight;
  if (maxScroll <= 0) return meta.minExponent;
  const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  return meta.minExponent + progress * (meta.maxExponent - meta.minExponent);
}

export function exponentToY(exponent: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  if (range <= 0) return 0;
  const progress = (exponent - meta.minExponent) / range;
  return progress * (totalHeight(meta) - window.innerHeight);
}

export function hueForExponent(exponent: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  const progress = (exponent - meta.minExponent) / range;
  // Small scale: cool purple (270) → large scale: warm orange (30)
  return 270 - progress * 240;
}
