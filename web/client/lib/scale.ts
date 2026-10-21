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

import { length, powerOfTen, yearsAgo, yen } from "./format.ts";

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
  /** The amount is exact (a 2,000円 note, a 10億円 jackpot), so its label drops the "約". */
  exact?: boolean;
  /** Which card survives a collision: higher wins. Defaults to 0. */
  priority?: number;
}

export interface ScaleData {
  meta: ScaleMeta;
  entries: ScaleEntry[];
}

/** The kinds of scale this site knows how to label. */
export type ScaleKind = "history" | "length" | "money";

/** One entry, placed. */
export interface Point {
  /** log₁₀ of the magnitude, clamped onto the axis. */
  log: number;
  /** The magnitude as a reader would say it: `約45億年前`, `1.7 m`, `1868年`. */
  label: string;
  name: string;
  nameEn: string;
  description: string;
  /** Higher keeps its card when cards collide. */
  priority: number;
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
  const kind: ScaleKind = data.meta.id === "length" || data.meta.id === "money"
    ? data.meta.id
    : "history";
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
        : kind === "money"
        ? `${entry.exact ? "" : "約"}${yen(magnitude)}`
        : yearsAgo(magnitude),
      name: entry.name,
      nameEn: entry.nameEn,
      description: entry.description,
      priority: entry.priority ?? 0,
    };
  }).sort((a, b) => b.log - a.log);

  return {
    kind,
    title: data.meta.title,
    subtitle: data.meta.subtitle,
    hi,
    lo,
    // History starts at the Big Bang and scrolls forward in time; length starts at human size,
    // money at a 1万円 note.
    start: kind === "history"
      ? points[0]?.log ?? hi
      : kind === "money"
      ? 4
      : Math.log10(1.7),
    points,
  };
}

/** What a magnitude at `log` reads as on this scale. */
export function readout(kind: ScaleKind, log: number): string {
  const n = 10 ** log;
  if (kind === "length") return `約${length(n)}`;
  if (kind === "money") return `約${yen(n)}`;
  return yearsAgo(n);
}

/** A decade gridline's caption: `10⁹` and what that is in words. */
export function decadeCaption(
  kind: ScaleKind,
  exponent: number,
): { power: string; words: string } {
  const n = 10 ** exponent;
  const words = kind === "length"
    ? length(n)
    : kind === "money"
    ? yen(n)
    : yearsAgo(n).replace(/^約/, "");
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
 * Greedy, most important first: each card wants to be centred on its anchor, may slide up or down
 * into the gap between the cards already placed above and below it, and is dropped (left as a bare
 * dot on the axis) when that would carry it more than `maxShift` from where it belongs. Cards never
 * swap order, so leaders never cross. Zooming out drops cards — the least important first —
 * and zooming in brings them back; no card ever floats far from the thing it names.
 *
 * With equal priorities this is the plain top-to-bottom push: the upper card wins.
 *
 * `pinned`, when set, is placed first and always shown: the entry under the reticle.
 *
 * @param anchors Anchor y per card, ascending
 * @param heights Card height per card
 */
export function placeCards(
  anchors: readonly number[],
  heights: readonly number[],
  { gap = 4, maxShift = 40, pinned = -1, priorities = [] }: {
    gap?: number;
    maxShift?: number;
    pinned?: number;
    /** Higher goes first; missing counts as 0. */
    priorities?: readonly number[];
  } = {},
): Slot[] {
  const n = anchors.length;
  const slots: Slot[] = anchors.map((a, i) => ({
    top: a - heights[i] / 2,
    visible: false,
  }));
  const rank = (i: number) => i === pinned ? Infinity : priorities[i] ?? 0;
  // Stable: equal priorities keep top-to-bottom order.
  const order = [...anchors.keys()].sort((a, b) => rank(b) - rank(a) || a - b);
  const dropped: [top: number, bottom: number, rank: number][] = [];

  for (const i of order) {
    // The gap between the nearest placed cards above and below this one.
    let floor = -Infinity;
    for (let j = i - 1; j >= 0; j--) {
      if (slots[j].visible) {
        floor = slots[j].top + heights[j] + gap;
        break;
      }
    }
    let ceiling = Infinity;
    for (let j = i + 1; j < n; j++) {
      if (slots[j].visible) {
        ceiling = slots[j].top - gap;
        break;
      }
    }
    const want = slots[i].top;
    const top = Math.max(floor, Math.min(want, ceiling - heights[i]));
    const fits = top + heights[i] <= ceiling &&
      Math.abs(top - want) <= maxShift &&
      // A more important card that didn't fit keeps its spot empty rather than ceding it.
      !dropped.some(([t, b, r]) =>
        r > rank(i) && top < b + gap && top + heights[i] + gap > t
      );
    if (fits || i === pinned) slots[i] = { top, visible: true };
    else dropped.push([want, want + heights[i], rank(i)]);
  }
  return slots;
}

/** Background hue at a fraction down the axis: violet at the top, amber at the bottom. */
export function hueAt(fraction: number): number {
  const f = Math.min(Math.max(fraction, 0), 1);
  return 270 - f * 240;
}

// --- horizontal swipe zoom ------------------------------------------------------------------

/** A sideways swipe across the whole screen width zooms by this factor. */
export const SWIPE_WIDTH_FACTOR = 10;

/** The zoom factor for a sideways swipe of `dx` px on a screen `width` px wide (right = in). */
export function swipeFactor(dx: number, width: number): number {
  return SWIPE_WIDTH_FACTOR ** (dx / Math.max(width, 1));
}

/**
 * Whether a one-finger move has shown its direction yet, and which: `null` while it is still
 * within `slop` px of where it started, then `"zoom"` for mostly sideways and `"scroll"` for
 * everything else. Decided once per touch, so a swipe never flips between the two.
 */
export function swipeAxis(
  dx: number,
  dy: number,
  slop = 8,
): "zoom" | "scroll" | null {
  if (Math.hypot(dx, dy) < slop) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? "zoom" : "scroll";
}
