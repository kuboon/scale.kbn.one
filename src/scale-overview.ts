import { ScaleMeta } from "./types";
import { ViewportState, overviewFraction } from "./scroll-engine";
import { superscript, humanReadable } from "./format";

let rootEl: HTMLElement | null = null;
let trackEl: HTMLElement | null = null;
let windowEl: HTMLElement | null = null;
let expEl: HTMLElement | null = null;
let readableEl: HTMLElement | null = null;
let flashEl: HTMLElement | null = null;
let prevIntExponent: number | null = null;

// At deep zoom the window is far below a pixel tall; keep it as a position marker
const MIN_WINDOW_PX = 5;

/**
 * The leftmost of the two vertical lines: a fixed bar covering the whole scale,
 * with the slice the detail axis (the second line) is currently showing
 * highlighted on it. Logarithmic, so that slice stays visible at any zoom.
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

  trackEl = rootEl.querySelector(".overview-track")!;
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
  if (!rootEl || !trackEl || !windowEl) return;

  const height = trackEl.clientHeight;
  const spanPx = Math.max(
    MIN_WINDOW_PX,
    (overviewFraction(vp.bottom, meta) - overviewFraction(vp.top, meta)) * height,
  );
  const y = Math.min(overviewFraction(vp.top, meta) * height, height - spanPx);

  // Height rather than scaleY: scaling would stretch the glow and corner radius
  // with it. One absolutely-positioned element, so the layout cost is confined.
  windowEl.style.transform = `translateY(${Math.max(0, y)}px)`;
  windowEl.style.height = `${spanPx}px`;

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
  trackEl = null;
  windowEl = null;
  expEl = null;
  readableEl = null;
  flashEl = null;
  prevIntExponent = null;
}
