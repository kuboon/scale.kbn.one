import { ScaleMeta } from './types';

export function totalHeight(meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  return range * meta.pixelsPerExponent + window.innerHeight;
}

/** Returns true if the scale should be displayed in reverse (top=max, bottom=min) */
function isReversed(meta: ScaleMeta): boolean {
  return meta.id === 'history';
}

export function scrollYToExponent(scrollY: number, meta: ScaleMeta): number {
  const maxScroll = totalHeight(meta) - window.innerHeight;
  if (maxScroll <= 0) return meta.minExponent;
  const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  if (isReversed(meta)) {
    // top = maxExponent (distant past), bottom = minExponent (present)
    return meta.maxExponent - progress * (meta.maxExponent - meta.minExponent);
  }
  return meta.minExponent + progress * (meta.maxExponent - meta.minExponent);
}

export function exponentToY(exponent: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  if (range <= 0) return 0;
  if (isReversed(meta)) {
    const progress = (meta.maxExponent - exponent) / range;
    return progress * (totalHeight(meta) - window.innerHeight);
  }
  const progress = (exponent - meta.minExponent) / range;
  return progress * (totalHeight(meta) - window.innerHeight);
}

export function hueForExponent(exponent: number, meta: ScaleMeta): number {
  const range = meta.maxExponent - meta.minExponent;
  const progress = (exponent - meta.minExponent) / range;
  // Small scale: cool purple (270) → large scale: warm orange (30)
  return 270 - progress * 240;
}
