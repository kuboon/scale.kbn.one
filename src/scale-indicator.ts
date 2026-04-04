import { ScaleMeta } from './types';
import { scrollYToExponent, hueForExponent } from './scroll-engine';

let indicatorEl: HTMLElement | null = null;
let rafId = 0;

export function createIndicator(meta: ScaleMeta): HTMLElement {
  indicatorEl = document.createElement('div');
  indicatorEl.className = 'scale-indicator';
  indicatorEl.innerHTML = `
    <span class="scale-indicator-exp"></span>
    <span class="scale-indicator-readable"></span>
  `;
  return indicatorEl;
}

export function updateIndicator(meta: ScaleMeta) {
  if (!indicatorEl) return;
  cancelAnimationFrame(rafId);

  rafId = requestAnimationFrame(() => {
    const exponent = scrollYToExponent(window.scrollY, meta);
    const rounded = Math.round(exponent);
    const hue = hueForExponent(exponent, meta);

    const expEl = indicatorEl!.querySelector('.scale-indicator-exp')!;
    const readableEl = indicatorEl!.querySelector('.scale-indicator-readable')!;

    const sign = rounded >= 0 ? '+' : '';
    expEl.textContent = `10${superscript(sign + rounded)} ${meta.unitSymbol}`;
    readableEl.textContent = humanReadable(rounded, meta.id);

    document.documentElement.style.setProperty('--bg-hue', String(hue));
  });
}

export function destroyIndicator() {
  cancelAnimationFrame(rafId);
  indicatorEl = null;
}

function superscript(s: string): string {
  const map: Record<string, string> = {
    '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
    '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
    '8': '\u2078', '9': '\u2079', '-': '\u207B', '+': '\u207A',
  };
  return s.split('').map(c => map[c] ?? c).join('');
}

function humanReadable(exp: number, scaleId: string): string {
  if (scaleId === 'time') return humanTime(exp);
  return humanLength(exp);
}

function humanTime(exp: number): string {
  if (exp < -24) return '';
  if (exp < -12) return `${10 ** (exp + 15)} fs`;
  if (exp < -9) return `${10 ** (exp + 12)} ps`;
  if (exp < -6) return `${10 ** (exp + 9)} ns`;
  if (exp < -3) return `${10 ** (exp + 6)} \u00B5s`;
  if (exp < 0) return `${10 ** (exp + 3)} ms`;
  if (exp === 0) return '1秒';
  if (exp === 1) return '10秒';
  if (exp === 2) return '約1.7分';
  if (exp === 3) return '約17分';
  if (exp === 4) return '約2.8時間';
  if (exp === 5) return '約1.2日';
  if (exp === 6) return '約11.6日';
  if (exp === 7) return '約3.8ヶ月';
  if (exp === 8) return '約3.2年';
  if (exp === 9) return '約31.7年';
  if (exp === 10) return '約317年';
  if (exp === 11) return '約3,170年';
  if (exp === 12) return '約3.2万年';
  if (exp === 13) return '約31.7万年';
  if (exp === 14) return '約317万年';
  if (exp === 15) return '約3,170万年';
  if (exp === 16) return '約3.17億年';
  if (exp === 17) return '約138億年';
  if (exp >= 18) return '> 宇宙の年齢';
  return '';
}

function humanLength(exp: number): string {
  if (exp < -18) return '';
  if (exp < -12) return `${10 ** (exp + 15)} fm`;
  if (exp < -9) return `${10 ** (exp + 12)} pm`;
  if (exp < -6) return `${10 ** (exp + 9)} nm`;
  if (exp < -3) return `${10 ** (exp + 6)} \u00B5m`;
  if (exp < 0) return `${10 ** (exp + 3)} mm`;
  if (exp === 0) return '1 m';
  if (exp === 1) return '10 m';
  if (exp === 2) return '100 m';
  if (exp === 3) return '1 km';
  if (exp === 4) return '10 km';
  if (exp === 5) return '100 km';
  if (exp === 6) return '1,000 km';
  if (exp === 7) return '10,000 km';
  if (exp === 8) return '10万 km';
  if (exp === 9) return '100万 km';
  if (exp === 10) return '1,000万 km';
  if (exp === 11) return '1億 km';
  if (exp === 12) return '10億 km';
  if (exp === 13) return '100億 km';
  if (exp >= 16) return `約${10 ** (exp - 16)}光年`;
  return `10${superscript(String(exp))} m`;
}
