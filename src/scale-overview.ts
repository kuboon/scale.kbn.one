import { ScaleMeta } from "./types";
import {
  ViewportState,
  overviewDecades,
  decadeOccupancy,
  exponentToOverviewFraction,
} from "./scroll-engine";

let rootEl: HTMLElement | null = null;
let windowEl: HTMLElement | null = null;

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
  `;

  windowEl = rootEl.querySelector(".overview-window")!;
  rootEl.querySelector(".overview-cap--top")!.textContent = topLabel;
  rootEl.querySelector(".overview-cap--bottom")!.textContent = bottomLabel;

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
}

export function destroyOverview() {
  rootEl = null;
  windowEl = null;
}
