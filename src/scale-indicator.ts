import { ScaleMeta } from "./types";
import { scrollYToExponent, hueForExponent } from "./scroll-engine";
import { superscript } from "./format";

let indicatorEl: HTMLElement | null = null;
let flashEl: HTMLElement | null = null;
let rafId = 0;
let prevIntExponent: number | null = null;

export function createIndicator(meta: ScaleMeta): HTMLElement {
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

export function updateIndicator(meta: ScaleMeta) {
  if (!indicatorEl) return;
  cancelAnimationFrame(rafId);

  rafId = requestAnimationFrame(() => {
    const exponent = scrollYToExponent(window.scrollY, meta);
    const rounded = Math.round(exponent);
    const hue = hueForExponent(exponent, meta);

    const expEl = indicatorEl!.querySelector(".scale-indicator-exp")!;
    const readableEl = indicatorEl!.querySelector(".scale-indicator-readable")!;

    const sign = rounded >= 0 ? "+" : "";
    expEl.textContent = `10${superscript(sign + rounded)} ${meta.unitSymbol}`;
    readableEl.textContent = humanReadable(rounded, meta.id);

    document.documentElement.style.setProperty("--bg-hue", String(hue));

    // Boundary crossing flash
    if (flashEl && prevIntExponent !== null && rounded !== prevIntExponent) {
      const arrow = rounded > prevIntExponent ? "\u2191" : "\u2193";
      flashEl.textContent = `\u00d710${arrow}`;
      flashEl.classList.remove("boundary-flash--active");
      void flashEl.offsetWidth; // force reflow to restart animation
      flashEl.classList.add("boundary-flash--active");
    }
    prevIntExponent = rounded;
  });
}

export function destroyIndicator() {
  cancelAnimationFrame(rafId);
  indicatorEl = null;
  flashEl = null;
  prevIntExponent = null;
}

function humanReadable(exp: number, scaleId: string): string {
  if (scaleId === "history") return humanHistory(exp);
  return humanLength(exp);
}

function humanHistory(exp: number): string {
  if (exp <= 0) return "現在";
  const years = 10 ** exp;
  if (years < 1e4) return `約${Math.round(years).toLocaleString()}年前`;
  if (years < 1e8) return `約${(years / 1e4).toFixed(years < 1e5 ? 1 : 0)}万年前`;
  if (years < 1e12) return `約${(years / 1e8).toFixed(years < 1e9 ? 1 : 0)}億年前`;
  return "";
}

function humanLength(exp: number): string {
  if (exp < -18) return "";
  if (exp < -12) return `${10 ** (exp + 15)} fm`;
  if (exp < -9) return `${10 ** (exp + 12)} pm`;
  if (exp < -6) return `${10 ** (exp + 9)} nm`;
  if (exp < -3) return `${10 ** (exp + 6)} \u00B5m`;
  if (exp < 0) return `${10 ** (exp + 3)} mm`;
  if (exp === 0) return "1 m";
  if (exp === 1) return "10 m";
  if (exp === 2) return "100 m";
  if (exp === 3) return "1 km";
  if (exp === 4) return "10 km";
  if (exp === 5) return "100 km";
  if (exp === 6) return "1,000 km";
  if (exp === 7) return "10,000 km";
  if (exp === 8) return "10万 km";
  if (exp === 9) return "100万 km";
  if (exp === 10) return "1,000万 km";
  if (exp === 11) return "1億 km";
  if (exp === 12) return "10億 km";
  if (exp === 13) return "100億 km";
  if (exp >= 16) return `約${10 ** (exp - 16)}光年`;
  return `10${superscript(String(exp))} m`;
}
