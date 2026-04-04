import { ScaleData } from './types';
import { totalHeight, exponentToY } from './scroll-engine';
import { createScaleCard } from './scale-card';
import { createIndicator, updateIndicator, destroyIndicator } from './scale-indicator';
import { superscript } from './format';

let scrollHandler: (() => void) | null = null;
let observer: IntersectionObserver | null = null;

export function renderExplorer(container: HTMLElement, data: ScaleData) {
  const height = totalHeight(data.meta);

  container.innerHTML = `
    <div class="explorer">
      <a href="#" class="explorer-back">\u2190 戻る</a>
      <div class="explorer-header">
        <h1 class="explorer-title">${data.meta.title}</h1>
        <p class="explorer-subtitle">${data.meta.subtitle}</p>
      </div>
      <div class="explorer-track" style="height:${height}px"></div>
    </div>
  `;

  const track = container.querySelector('.explorer-track')!;

  // Create scale line
  const line = document.createElement('div');
  line.className = 'explorer-line';
  track.appendChild(line);

  // Create tick ruler & ×10 step markers
  const minTick = Math.ceil(data.meta.minExponent);
  const maxTick = Math.floor(data.meta.maxExponent);
  for (let exp = minTick; exp <= maxTick; exp++) {
    const y = exponentToY(exp, data.meta);
    const tick = document.createElement('div');
    tick.className = 'tick-mark';
    tick.style.top = `${y}px`;

    const sign = exp >= 0 ? '+' : '';
    tick.innerHTML = `<span class="tick-label">10${superscript(sign + exp)}</span>`;
    track.appendChild(tick);

    // ×10 step marker between this tick and the next
    if (exp < maxTick) {
      const nextY = exponentToY(exp + 1, data.meta);
      const midY = (y + nextY) / 2;
      const marker = document.createElement('div');
      marker.className = 'step-marker';
      marker.style.top = `${midY}px`;
      marker.textContent = '×10';
      track.appendChild(marker);
    }
  }

  // Create cards
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer?.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 },
  );

  // Count items per exponent group for stacking offset
  const groupCount = new Map<number, number>();
  for (const entry of data.entries) {
    const count = groupCount.get(entry.exponent) ?? 0;
    const card = createScaleCard(entry, data.meta, count);
    track.appendChild(card);
    observer.observe(card);
    groupCount.set(entry.exponent, count + 1);
  }

  // Create indicator
  const indicator = createIndicator(data.meta);
  container.querySelector('.explorer')!.appendChild(indicator);

  // Scroll listener
  scrollHandler = () => updateIndicator(data.meta);
  window.addEventListener('scroll', scrollHandler, { passive: true });
  updateIndicator(data.meta);

  // Scroll to top
  window.scrollTo(0, 0);
}

export function destroyExplorer() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  destroyIndicator();
}
