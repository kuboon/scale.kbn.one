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
  if (exp <= 3) return `${10 ** exp}年前`;
  if (exp === 4) return '1万年前';
  if (exp === 5) return '10万年前';
  if (exp === 6) return '100万年前';
  if (exp === 7) return '1,000万年前';
  if (exp === 8) return '1億年前';
  if (exp === 9) return '10億年前';
  if (exp === 10) return '100億年前';
  return `10<sup>${exp}</sup>年前`;
}
