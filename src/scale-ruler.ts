import { ScaleMeta } from "./types";
import { ViewportState } from "./scroll-engine";
import { superscript, humanReadable, formatTickValue } from "./format";

const MAX_RULER_TICKS = 20;
const MIN_LABEL_PX = 58; // narrowest gap two graduation labels may sit at

let rulerEl: HTMLElement | null = null;
let trackEl: HTMLElement | null = null;
let expEl: HTMLElement | null = null;
let readableEl: HTMLElement | null = null;
let flashEl: HTMLElement | null = null;
let tickPool: HTMLElement[] = [];
let prevIntExponent: number | null = null;

/**
 * Horizontal ruler pinned to the bottom of the explorer. It mirrors the vertical
 * axis, so its graduations spread apart as a rightward swipe zooms in.
 */
export function createRuler(_meta: ScaleMeta): HTMLElement {
  rulerEl = document.createElement("div");
  rulerEl.className = "scale-ruler";
  rulerEl.innerHTML = `
    <span class="boundary-flash"></span>
    <div class="scale-ruler-readout">
      <span class="scale-ruler-exp"></span>
      <span class="scale-ruler-readable"></span>
    </div>
    <div class="scale-ruler-track"></div>
  `;

  trackEl = rulerEl.querySelector(".scale-ruler-track")!;
  expEl = rulerEl.querySelector(".scale-ruler-exp")!;
  readableEl = rulerEl.querySelector(".scale-ruler-readable")!;
  flashEl = rulerEl.querySelector(".boundary-flash")!;
  flashEl.addEventListener("animationend", () => {
    flashEl!.classList.remove("boundary-flash--active");
  });

  tickPool = [];
  for (let i = 0; i < MAX_RULER_TICKS; i++) {
    const tick = document.createElement("div");
    tick.className = "ruler-tick";
    tick.innerHTML = `<span class="ruler-tick-label"></span>`;
    trackEl.appendChild(tick);
    tickPool.push(tick);
  }

  prevIntExponent = null;
  return rulerEl;
}

export function updateRuler(meta: ScaleMeta, vp: ViewportState, ticks: number[]) {
  if (!rulerEl || !trackEl) return;

  const width = trackEl.clientWidth;

  // Label only every nth graduation so the numbers never run into each other.
  // Keyed off the step grid rather than the array index, so labels don't
  // flicker between ticks as the ruler scrolls.
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : vp.span;
  const pixelsPerTick = Math.max((step / vp.span) * width, 1);
  const labelStride = Math.max(1, Math.ceil(MIN_LABEL_PX / pixelsPerTick));

  for (let i = 0; i < MAX_RULER_TICKS; i++) {
    const el = tickPool[i];
    const value = ticks[i];
    if (value === undefined) {
      el.style.display = "none";
      continue;
    }

    const fraction = (value - vp.bottom) / vp.span;
    if (fraction < 0 || fraction > 1) {
      el.style.display = "none";
      continue;
    }

    const isMajor = Math.round(value / step) % labelStride === 0;
    el.style.display = "";
    el.style.transform = `translateX(${fraction * width}px)`;
    el.classList.toggle("ruler-tick--major", isMajor);
    el.querySelector(".ruler-tick-label")!.textContent = isMajor ? formatTickValue(value) : "";
  }

  const rounded = Math.round(vp.spanExp);
  const sign = rounded >= 0 ? "+" : "";
  expEl!.textContent = `10${superscript(sign + rounded)} ${meta.unitSymbol}`;
  readableEl!.textContent = humanReadable(rounded, meta.id);

  // Zoom boundary crossing flash
  if (flashEl && prevIntExponent !== null && rounded !== prevIntExponent) {
    const arrow = rounded > prevIntExponent ? "↑" : "↓";
    flashEl.textContent = `×10${arrow}`;
    flashEl.classList.remove("boundary-flash--active");
    void flashEl.offsetWidth;
    flashEl.classList.add("boundary-flash--active");
  }
  prevIntExponent = rounded;
}

export function destroyRuler() {
  rulerEl = null;
  trackEl = null;
  expEl = null;
  readableEl = null;
  flashEl = null;
  tickPool = [];
  prevIntExponent = null;
}
