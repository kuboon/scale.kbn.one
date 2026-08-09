import { ScaleMeta } from "./types";
import {
  ViewportState,
  overviewDecades,
  decadeOccupancy,
  exponentToOverviewFraction,
} from "./scroll-engine";
import { superscript, humanReadable } from "./format";

let rootEl: HTMLElement | null = null;
let windowEl: HTMLElement | null = null;
let expEl: HTMLElement | null = null;
let readableEl: HTMLElement | null = null;
let flashEl: HTMLElement | null = null;
let prevIntExponent: number | null = null;

// A decade holding ≥10% of the screen is fully bright…
const BRIGHTNESS_GAIN = 10;
// …and a sub-linear curve lifts the faint tail, so the fade-out below the
// bright band reads as a gradient rather than a cliff.
const BRIGHTNESS_GAMMA = 0.3;

/**
 * The leftmost of the two vertical lines: a fixed logarithmic bar covering the
 * whole scale, with the slice the detail axis (the second line) is currently
 * showing drawn on it as a brightness gradient — see scroll-engine.ts for why
 * a hard-edged window can't work here.
 *
 * Also owns the zoom readout, which names the magnitude the detail axis spans.
 */
export function createOverview(topLabel: string, bottomLabel: string): HTMLElement {
  rootEl = document.createElement("div");
  rootEl.className = "scale-chrome";
  rootEl.innerHTML = `
    <div class="overview">
      <span class="overview-cap overview-cap--top"></span>
      <div class="overview-track"><div class="overview-window"></div></div>
      <span class="overview-cap overview-cap--bottom"></span>
    </div>
    <div class="scale-readout">
      <span class="boundary-flash"></span>
      <span class="scale-readout-exp"></span>
      <span class="scale-readout-readable"></span>
    </div>
  `;

  windowEl = rootEl.querySelector(".overview-window")!;
  expEl = rootEl.querySelector(".scale-readout-exp")!;
  readableEl = rootEl.querySelector(".scale-readout-readable")!;
  flashEl = rootEl.querySelector(".boundary-flash")!;
  flashEl.addEventListener("animationend", () => {
    flashEl!.classList.remove("boundary-flash--active");
  });

  rootEl.querySelector(".overview-cap--top")!.textContent = topLabel;
  rootEl.querySelector(".overview-cap--bottom")!.textContent = bottomLabel;

  prevIntExponent = null;
  return rootEl;
}

export function updateOverview(meta: ScaleMeta, vp: ViewportState) {
  if (!rootEl || !windowEl) return;

  // One gradient stop per decade, at the decade band's midpoint on the bar,
  // ordered top (large values) to bottom. Rebuilding a ~dozen-stop gradient
  // string per frame repaints only this 4px-wide element.
  const decades = overviewDecades(meta);
  const stops: string[] = [];
  for (let i = decades.length - 1; i >= 0; i--) {
    const d = decades[i];
    const alpha = Math.min(1, (decadeOccupancy(vp, d) * BRIGHTNESS_GAIN) ** BRIGHTNESS_GAMMA);
    const mid =
      (exponentToOverviewFraction(d + 1, meta) + exponentToOverviewFraction(d, meta)) / 2;
    stops.push(
      `color-mix(in srgb, var(--text-accent) ${(alpha * 100).toFixed(1)}%, transparent) ${(mid * 100).toFixed(2)}%`,
    );
  }
  windowEl.style.background = `linear-gradient(to bottom, ${stops.join(", ")})`;

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

export function destroyOverview() {
  rootEl = null;
  windowEl = null;
  expEl = null;
  readableEl = null;
  flashEl = null;
  prevIntExponent = null;
}
