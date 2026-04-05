import { ScaleData } from "./types.ts";
import { getViewport, valueToFraction, hueForExponent, computeTicks } from "./scroll-engine.ts";
import { createIndicator, updateIndicator, destroyIndicator } from "./scale-indicator.ts";
import { toJapaneseLabel } from "./format.ts";

let cleanup: (() => void) | null = null;

interface CardInfo {
  el: HTMLElement;
  value: number;
}

const MAX_TICKS = 20;
const TOP_PAD = 120;
const BOTTOM_PAD = 200;

export function renderExplorer(container: HTMLElement, data: ScaleData) {
  const { meta } = data;
  let currentExp = meta.maxExponent;
  let targetExp = meta.maxExponent;
  let rafId = 0;

  // Prevent body scroll
  document.body.style.overflow = "hidden";

  container.innerHTML = `
    <div class="explorer">
      <a href="#" class="explorer-back">\u2190 戻る</a>
      <div class="explorer-viewport">
        <div class="explorer-line"></div>
      </div>
    </div>
  `;

  const explorerEl = container.querySelector(".explorer")! as HTMLElement;
  const viewport = container.querySelector(".explorer-viewport")! as HTMLElement;

  // Create tick pool
  const tickPool: HTMLElement[] = [];
  for (let i = 0; i < MAX_TICKS; i++) {
    const tick = document.createElement("div");
    tick.className = "tick-mark";
    tick.innerHTML = `<span class="tick-label"></span>`;
    viewport.appendChild(tick);
    tickPool.push(tick);
  }

  // Create card elements (sorted by value descending = top to bottom on reversed axis)
  const cards: CardInfo[] = [];
  for (const entry of data.entries) {
    const el = document.createElement("div");
    el.className = "scale-card";
    const label = toJapaneseLabel(entry.value, entry.exponent, meta.unitSymbol);
    el.innerHTML = `
      <div><span class="scale-card-exponent">${label}</span> <span class="scale-card-name">${entry.name}</span></div>
      <div class="scale-card-desc">${entry.description}</div>
    `;
    viewport.appendChild(el);
    cards.push({
      el,
      value: entry.value > 0 ? entry.value * 10 ** entry.exponent : 10 ** entry.exponent,
    });
  }

  // Create indicator
  const indicator = createIndicator(meta);
  explorerEl.appendChild(indicator);

  // --- Input handling ---
  const WHEEL_SENSITIVITY = 0.002;
  const TOUCH_SENSITIVITY = 0.005;
  let touchY = 0;

  function clampTarget() {
    targetExp = Math.max(meta.minExponent, Math.min(meta.maxExponent, targetExp));
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    // Scroll down (positive deltaY) → decrease exponent → zoom in
    targetExp -= e.deltaY * WHEEL_SENSITIVITY;
    clampTarget();
  }

  function onTouchStart(e: TouchEvent) {
    touchY = e.touches[0].clientY;
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const y = e.touches[0].clientY;
    const dy = touchY - y; // positive when swiping up = "scroll down"
    touchY = y;
    targetExp -= dy * TOUCH_SENSITIVITY;
    clampTarget();
  }

  explorerEl.addEventListener("wheel", onWheel, { passive: false });
  explorerEl.addEventListener("touchstart", onTouchStart, { passive: true });
  explorerEl.addEventListener("touchmove", onTouchMove, { passive: false });

  // --- Animation loop ---
  function frame() {
    currentExp += (targetExp - currentExp) * 0.12;

    const vpHeight = viewport.clientHeight;
    const usableH = vpHeight - TOP_PAD - BOTTOM_PAD;
    const vp = getViewport(currentExp);

    // Update cards
    for (const c of cards) {
      const frac = valueToFraction(c.value, vp, meta);

      if (frac >= -0.3 && frac <= 1.3) {
        const y = TOP_PAD + frac * usableH;
        c.el.style.display = "";
        c.el.style.transform = `translateY(${y}px)`;
        // Fade at edges
        const edge = frac < 0 ? -frac / 0.3 : frac > 1 ? (frac - 1) / 0.3 : 0;
        c.el.style.opacity = String(Math.max(0, 1 - edge));
        if (!c.el.classList.contains("visible")) c.el.classList.add("visible");
      } else {
        c.el.style.display = "none";
      }
    }

    // Update ticks
    const ticks = computeTicks(vp.rangeMin, vp.rangeMax);
    for (let i = 0; i < MAX_TICKS; i++) {
      const tel = tickPool[i];
      if (i < ticks.length) {
        const frac = valueToFraction(ticks[i], vp, meta);
        if (frac >= -0.05 && frac <= 1.05) {
          const y = TOP_PAD + frac * usableH;
          tel.style.display = "";
          tel.style.transform = `translateY(${y}px)`;
          tel.querySelector(".tick-label")!.textContent = formatTickLabel(ticks[i]);
        } else {
          tel.style.display = "none";
        }
      } else {
        tel.style.display = "none";
      }
    }

    // Update indicator & hue
    updateIndicator(meta, currentExp);
    const hue = hueForExponent(currentExp, meta);
    document.documentElement.style.setProperty("--bg-hue", String(hue));

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  cleanup = () => {
    cancelAnimationFrame(rafId);
    explorerEl.removeEventListener("wheel", onWheel);
    explorerEl.removeEventListener("touchstart", onTouchStart);
    explorerEl.removeEventListener("touchmove", onTouchMove);
    document.body.style.overflow = "";
  };
}

export function destroyExplorer() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  destroyIndicator();
}

function formatTickLabel(value: number): string {
  const exp = Math.floor(Math.log10(value));
  const coeff = Math.round(value / 10 ** exp);
  return `${coeff}`;
}
