/**
 * The scale model: what the YAML says, turned into points on a log₁₀ axis, plus the pure layout
 * math the explorer runs every time the zoom changes.
 *
 * Nothing here touches the DOM, so the server can run all of it to render the first frame and the
 * tests can run it with no browser.
 *
 * The axis runs top to bottom from `hi` to `lo` in log₁₀ units — the largest thing at the top —
 * and one decade is `decadePx` pixels tall. Scrolling the page moves along it; zooming changes
 * `decadePx`.
 */

import { length, powerOfTen, yearsAgo } from "./format.ts";

/** `meta:` in `data/*.yaml`. */
export interface ScaleMeta {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  unitSymbol: string;
  minExponent: number;
  maxExponent: number;
}

/** One item of `entries:` in `data/*.yaml`: `value × 10^exponent`, or a calendar year `ad`. */
export interface ScaleEntry {
  exponent?: number;
  value?: number;
  ad?: number;
  name: string;
  nameEn: string;
  description: string;
}

export interface ScaleData {
  meta: ScaleMeta;
  entries: ScaleEntry[];
}

/** The kinds of scale this site knows how to label. */
export type ScaleKind = "history" | "length";

/** One entry, placed. */
export interface Point {
  /** log₁₀ of the magnitude, clamped onto the axis. */
  log: number;
  /** The magnitude as a reader would say it: `約45億年前`, `1.7 m`, `1868年`. */
  label: string;
  name: string;
  nameEn: string;
  description: string;
  // The island's props have to be serializable, which is an index signature.
  [key: string]: string | number;
}

/** Everything the explorer is handed. */
export interface Axis {
  kind: ScaleKind;
  title: string;
  subtitle: string;
  /** Top and bottom of the axis, in log₁₀ units. `hi > lo`. */
  hi: number;
  lo: number;
  /** Where the reticle starts. */
  start: number;
  /** Top to bottom. */
  points: Point[];
  [key: string]: string | number | Point[];
}

/** Room left above the largest entry and below the smallest, in decades. */
const MARGIN = 0.4;

/**
 * Turns a scale's YAML into an axis.
 *
 * A log axis cannot reach zero, which matters for exactly one thing: "現在" on the history scale.
 * Zero is pinned to the bottom of the axis, half a decade below the smallest nonzero entry.
 *
 * @param data The parsed YAML
 * @param refYear The year `ad:` entries count back from — the build's year
 */
export function toAxis(data: ScaleData, refYear: number): Axis {
  const kind: ScaleKind = data.meta.id === "length" ? "length" : "history";
  const magnitudes = data.entries.map((entry) =>
    entry.ad !== undefined
      ? Math.max(refYear - entry.ad, 0)
      : (entry.value ?? 0) * 10 ** (entry.exponent ?? 0)
  );
  const logs = magnitudes.filter((m) => m > 0).map(Math.log10);
  const hi = Math.max(data.meta.maxExponent, ...logs) + MARGIN;
  const lo = Math.min(data.meta.minExponent, ...logs) - MARGIN;

  const points = data.entries.map((entry, i): Point => {
    const magnitude = magnitudes[i];
    return {
      log: magnitude > 0 ? Math.log10(magnitude) : lo,
      label: entry.ad !== undefined
        ? `${entry.ad}年`
        : kind === "length"
        ? `約${length(magnitude)}`
        : yearsAgo(magnitude),
      name: entry.name,
      nameEn: entry.nameEn,
      description: entry.description,
    };
  }).sort((a, b) => b.log - a.log);

  return {
    kind,
    title: data.meta.title,
    subtitle: data.meta.subtitle,
    hi,
    lo,
    // History starts at the Big Bang and scrolls forward in time; length starts at human size.
    start: kind === "history" ? points[0]?.log ?? hi : Math.log10(1.7),
    points,
  };
}

/** What a magnitude at `log` reads as on this scale. */
export function readout(kind: ScaleKind, log: number): string {
  const n = 10 ** log;
  return kind === "length" ? `約${length(n)}` : yearsAgo(n);
}

/** A decade gridline's caption: `10⁹` and what that is in words. */
export function decadeCaption(
  kind: ScaleKind,
  exponent: number,
): { power: string; words: string } {
  const n = 10 ** exponent;
  const words = kind === "length" ? length(n) : yearsAgo(n).replace(/^約/, "");
  // Where no unit or counter reaches, the words would only repeat the power.
  return {
    power: powerOfTen(exponent),
    words: words.includes("10") && /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(words) ? "" : words,
  };
}

// --- geometry ------------------------------------------------------------------------------

/** y (px, from the top of the content) of a log value. */
export function logToY(log: number, hi: number, decadePx: number, pad: number) {
  return pad + (hi - log) * decadePx;
}

/** The inverse of {@link logToY}. */
export function yToLog(y: number, hi: number, decadePx: number, pad: number) {
  return hi - (y - pad) / decadePx;
}

/**
 * The scroll offset that keeps `log` under a fixed point on screen after a zoom.
 *
 * @param log The value that must stay put
 * @param screenY Where on screen it is (px from the viewport top)
 */
export function anchoredScroll(
  log: number,
  screenY: number,
  hi: number,
  decadePx: number,
  pad: number,
): number {
  return logToY(log, hi, decadePx, pad) - screenY;
}

/** Keeps `decadePx` between "the whole axis fits on screen" and "one decade is many screens". */
export function clampDecadePx(
  decadePx: number,
  span: number,
  viewportH: number,
): number {
  const min = Math.max(viewportH * 0.8 / span, 8);
  const max = viewportH * 12;
  return Math.min(Math.max(decadePx, min), max);
}

/**
 * Which decades get a caption: every `step`th, so captions stay at least `minGap` px apart.
 * Steps go 1, 2, 5, 10, … so the labelled set nests as you zoom out.
 */
export function captionStep(decadePx: number, minGap = 56): number {
  for (const step of [1, 2, 5, 10, 20, 50]) {
    if (step * decadePx >= minGap) return step;
  }
  return 100;
}

/** Where a card goes, or that it doesn't fit. */
export interface Slot {
  /** Top of the card, px from the top of the content. */
  top: number;
  visible: boolean;
}

/**
 * Places cards beside their anchors without overlapping.
 *
 * Greedy, top to bottom: each card wants to be centred on its anchor, is pushed down below the one
 * above it, and is dropped (left as a bare dot on the axis) when that push would carry it more than
 * `maxShift` from where it belongs. Zooming out drops cards; zooming in brings them back — the
 * label density follows the zoom, and no card ever floats far from the thing it names.
 *
 * `pinned`, when set, is placed first and always shown: the entry under the reticle.
 *
 * @param anchors Anchor y per card, ascending
 * @param heights Card height per card
 */
export function placeCards(
  anchors: readonly number[],
  heights: readonly number[],
  { gap = 4, maxShift = 40, pinned = -1 }: {
    gap?: number;
    maxShift?: number;
    pinned?: number;
  } = {},
): Slot[] {
  const slots: Slot[] = anchors.map((a, i) => ({
    top: a - heights[i] / 2,
    visible: false,
  }));
  const taken: [number, number][] = [];
  const overlaps = (top: number, h: number) =>
    taken.some(([t, b]) => top < b + gap && top + h + gap > t);

  if (pinned >= 0 && pinned < anchors.length) {
    slots[pinned].visible = true;
    taken.push([slots[pinned].top, slots[pinned].top + heights[pinned]]);
  }

  let cursor = -Infinity;
  for (let i = 0; i < anchors.length; i++) {
    if (i === pinned) {
      cursor = Math.max(cursor, slots[i].top + heights[i]);
      continue;
    }
    const want = anchors[i] - heights[i] / 2;
    let top = Math.max(want, cursor + gap);
    // Hop over the pinned card if it sits in the way.
    for (const [t, b] of taken) {
      if (top < b + gap && top + heights[i] + gap > t) top = b + gap;
    }
    if (top - want > maxShift || overlaps(top, heights[i])) continue;
    slots[i] = { top, visible: true };
    taken.push([top, top + heights[i]]);
    cursor = top + heights[i];
  }
  return slots;
}

/** Background hue at a fraction down the axis: violet at the top, amber at the bottom. */
export function hueAt(fraction: number): number {
  const f = Math.min(Math.max(fraction, 0), 1);
  return 270 - f * 240;
}
