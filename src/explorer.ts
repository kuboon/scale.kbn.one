import { ScaleData } from "./types.ts";
import {
  getViewport,
  valueToFraction,
  hueForExponent,
  computeTicks,
  clampSpanExp,
  clampBottom,
  dominantAxis,
  GestureAxis,
} from "./scroll-engine.ts";
import { createRuler, updateRuler, destroyRuler } from "./scale-ruler.ts";
import { toJapaneseLabel } from "./format.ts";

let cleanup: (() => void) | null = null;

interface CardInfo {
  el: HTMLElement;
  value: number;
}

const MAX_TICKS = 20;
const AXIS_TICKS = 10;
const TOP_PAD = 120;
const BOTTOM_PAD = 200;

export function renderExplorer(container: HTMLElement, data: ScaleData) {
  const { meta } = data;

  // Start fully zoomed out: the whole scale in one linear window
  let targetSpanExp = clampSpanExp(meta.maxExponent + 1, meta);
  let currentSpanExp = targetSpanExp;
  let targetBottom = 0;
  let currentBottom = 0;
  let rafId = 0;

  // Prevent body scroll
  document.body.style.overflow = "hidden";

  container.innerHTML = `
    <div class="explorer">
      <a href="#" class="explorer-back">← 戻る</a>
      <div class="explorer-viewport">
        <div class="explorer-line"></div>
      </div>
    </div>
  `;

  const explorerEl = container.querySelector(".explorer")! as HTMLElement;
  const viewport = container.querySelector(".explorer-viewport")! as HTMLElement;

  let usableH = Math.max(1, viewport.clientHeight - TOP_PAD - BOTTOM_PAD);

  // Create tick pool
  const tickPool: HTMLElement[] = [];
  for (let i = 0; i < MAX_TICKS; i++) {
    // Unlabelled: the bottom ruler carries the numbers, and a label here would
    // sit underneath the cards
    const tick = document.createElement("div");
    tick.className = "tick-mark";
    viewport.appendChild(tick);
    tickPool.push(tick);
  }

  // Create card elements, ordered top to bottom on the reversed axis
  const cards: CardInfo[] = [];
  for (const entry of data.entries) {
    const el = document.createElement("div");
    el.className = "scale-card";
    const label = toJapaneseLabel(entry.value, entry.exponent, meta.unitSymbol, entry.ad);
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
  cards.sort((a, b) => b.value - a.value);

  // Create bottom ruler
  const ruler = createRuler(meta);
  explorerEl.appendChild(ruler);

  // --- Input handling ---
  const ZOOM_PER_PIXEL = 0.005; // exponents per pixel of horizontal travel
  const WHEEL_ZOOM_PER_PIXEL = 0.002;
  const AXIS_LOCK_THRESHOLD = 8; // px of travel before a drag commits to an axis

  /** Horizontal input zooms: rightward shrinks the span */
  function zoomBy(exponentDelta: number) {
    targetSpanExp = clampSpanExp(targetSpanExp + exponentDelta, meta);
    targetBottom = clampBottom(targetBottom, 10 ** targetSpanExp, meta);
  }

  /** Vertical input pans linearly: positive pixels move toward the small end */
  function panBy(pixels: number) {
    const span = 10 ** targetSpanExp;
    targetBottom = clampBottom(targetBottom - (pixels / usableH) * span, span, meta);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (dominantAxis(e.deltaX, e.deltaY) === "horizontal") {
      zoomBy(-e.deltaX * WHEEL_ZOOM_PER_PIXEL);
    } else {
      panBy(e.deltaY);
    }
  }

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let axis: GestureAxis | null = null;

  function onTouchStart(e: TouchEvent) {
    startX = lastX = e.touches[0].clientX;
    startY = lastY = e.touches[0].clientY;
    axis = null;
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    if (axis === null) {
      if (Math.hypot(x - startX, y - startY) < AXIS_LOCK_THRESHOLD) {
        lastX = x;
        lastY = y;
        return;
      }
      axis = dominantAxis(x - startX, y - startY);
    }

    if (axis === "horizontal") {
      zoomBy(-(x - lastX) * ZOOM_PER_PIXEL);
    } else {
      panBy(lastY - y);
    }

    lastX = x;
    lastY = y;
  }

  explorerEl.addEventListener("wheel", onWheel, { passive: false });
  explorerEl.addEventListener("touchstart", onTouchStart, { passive: true });
  explorerEl.addEventListener("touchmove", onTouchMove, { passive: false });

  // --- Animation loop ---
  function frame() {
    currentSpanExp += (targetSpanExp - currentSpanExp) * 0.12;
    currentBottom += (targetBottom - currentBottom) * 0.12;

    usableH = Math.max(1, viewport.clientHeight - TOP_PAD - BOTTOM_PAD);
    const vp = getViewport(currentSpanExp, currentBottom);

    // Update cards. Crowded cards are left to overlap on purpose — zooming in
    // is what pulls them apart.
    for (const c of cards) {
      const frac = valueToFraction(c.value, vp);
      if (frac < -0.3 || frac > 1.3) {
        c.el.style.display = "none";
        continue;
      }

      c.el.style.display = "";
      c.el.style.transform = `translateY(${TOP_PAD + frac * usableH}px)`;
      // Fade at edges
      const edge = frac < 0 ? -frac / 0.3 : frac > 1 ? (frac - 1) / 0.3 : 0;
      c.el.style.opacity = String(Math.max(0, 1 - edge));
      if (!c.el.classList.contains("visible")) c.el.classList.add("visible");
    }

    // Update ticks — the ruler mirrors the same graduations horizontally
    const ticks = computeTicks(vp, AXIS_TICKS);
    for (let i = 0; i < MAX_TICKS; i++) {
      const tel = tickPool[i];
      const value = ticks[i];
      if (value === undefined) {
        tel.style.display = "none";
        continue;
      }

      const frac = valueToFraction(value, vp);
      if (frac >= -0.05 && frac <= 1.05) {
        tel.style.display = "";
        tel.style.transform = `translateY(${TOP_PAD + frac * usableH}px)`;
      } else {
        tel.style.display = "none";
      }
    }

    // Update ruler & hue
    updateRuler(meta, vp, ticks);
    const hue = hueForExponent(currentSpanExp, meta);
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
  destroyRuler();
}
