import { ScaleEntry, ScaleMeta } from './types';
import { exponentToY } from './scroll-engine';

const CARD_HEIGHT = 140; // approximate card height in px

export function createScaleCard(
  entry: ScaleEntry,
  meta: ScaleMeta,
  indexInGroup: number,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'scale-card';
  const baseY = exponentToY(entry.exponent, meta);
  card.style.top = `${baseY + indexInGroup * CARD_HEIGHT}px`;

  card.innerHTML = `
    <div class="scale-card-exponent">${formatExponent(entry.exponent, meta)}</div>
    <div class="scale-card-name">${entry.name}</div>
    <div class="scale-card-name-en">${entry.nameEn}</div>
    <div class="scale-card-desc">${entry.description}</div>
  `;

  return card;
}

function formatExponent(exp: number, meta: ScaleMeta): string {
  if (meta.id === 'history') {
    if (exp === 0) return '現在';
    return `約${humanYearsAgo(exp)}`;
  }
  const sign = exp >= 0 ? '+' : '';
  return `10<sup>${sign}${exp}</sup> ${meta.unitSymbol}`;
}

function humanYearsAgo(exp: number): string {
  const years = 10 ** exp;
  if (years < 1) return '現在';
  if (years < 1e4) return `${Math.round(years).toLocaleString()}年前`;
  if (years < 1e8) return `${(years / 1e4).toFixed(years < 1e5 ? 1 : 0)}万年前`;
  if (years < 1e12) return `${(years / 1e8).toFixed(years < 1e9 ? 1 : 0)}億年前`;
  return `10<sup>${exp}</sup>年前`;
}
