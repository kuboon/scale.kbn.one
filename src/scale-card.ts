import { ScaleEntry, ScaleMeta } from './types';
import { exponentToY } from './scroll-engine';

export function createScaleCard(entry: ScaleEntry, meta: ScaleMeta): HTMLElement {
  const card = document.createElement('div');
  card.className = 'scale-card';
  card.style.top = `${exponentToY(entry.exponent, meta)}px`;

  const expSign = entry.exponent >= 0 ? '+' : '';
  card.innerHTML = `
    <div class="scale-card-exponent">10<sup>${expSign}${entry.exponent}</sup> ${meta.unitSymbol}</div>
    <div class="scale-card-name">${entry.name}</div>
    <div class="scale-card-name-en">${entry.nameEn}</div>
    <div class="scale-card-desc">${entry.description}</div>
  `;

  return card;
}
