import { ScaleMeta } from "./types";
import { superscript, humanReadable } from "./format";

let indicatorEl: HTMLElement | null = null;
let flashEl: HTMLElement | null = null;
let prevIntExponent: number | null = null;

export function createIndicator(_meta: ScaleMeta): HTMLElement {
  indicatorEl = document.createElement("div");
  indicatorEl.className = "scale-indicator";
  indicatorEl.innerHTML = `
    <span class="boundary-flash"></span>
    <span class="scale-indicator-exp"></span>
    <span class="scale-indicator-readable"></span>
  `;
  flashEl = indicatorEl.querySelector(".boundary-flash")!;
  flashEl.addEventListener("animationend", () => {
    flashEl!.classList.remove("boundary-flash--active");
  });
  prevIntExponent = null;
  return indicatorEl;
}

export function updateIndicator(meta: ScaleMeta, exponent: number) {
  if (!indicatorEl) return;

  const rounded = Math.round(exponent);

  const expEl = indicatorEl.querySelector(".scale-indicator-exp")!;
  const readableEl = indicatorEl.querySelector(".scale-indicator-readable")!;

  const sign = rounded >= 0 ? "+" : "";
  expEl.textContent = `10${superscript(sign + rounded)} ${meta.unitSymbol}`;
  readableEl.textContent = humanReadable(rounded, meta.id);

  // Boundary crossing flash
  if (flashEl && prevIntExponent !== null && rounded !== prevIntExponent) {
    const arrow = rounded > prevIntExponent ? "\u2191" : "\u2193";
    flashEl.textContent = `\u00d710${arrow}`;
    flashEl.classList.remove("boundary-flash--active");
    void flashEl.offsetWidth;
    flashEl.classList.add("boundary-flash--active");
  }
  prevIntExponent = rounded;
}

export function destroyIndicator() {
  indicatorEl = null;
  flashEl = null;
  prevIntExponent = null;
}
