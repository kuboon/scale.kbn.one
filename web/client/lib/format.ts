/**
 * Number formatting for the two scales.
 *
 * Every label on the explorer is one of three shapes: a count of years ago in Japanese counters
 * (`約138億年前`), a length in the unit a person would reach for (`約1.7 m`, `約9.5兆 km`), or a
 * power of ten in superscript (`10⁻³⁵`) where no counter or unit makes sense any more.
 */

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "⁺",
  ".": "·",
};

/** `"-35"` → `"⁻³⁵"`. */
export function superscript(s: string): string {
  return [...s].map((c) => SUPERSCRIPT[c] ?? c).join("");
}

/** `10ⁿ` for an integer exponent. */
export function powerOfTen(exponent: number): string {
  return `10${superscript(String(exponent))}`;
}

/** Rounds to `digits` significant figures and drops trailing zeros: `4.567` → `4.57`. */
function sig(n: number, digits = 3): string {
  return String(+n.toPrecision(digits));
}

/** Japanese myriad counters, largest first. */
const COUNTERS: [number, string][] = [
  [1e20, "垓"],
  [1e16, "京"],
  [1e12, "兆"],
  [1e8, "億"],
  [1e4, "万"],
];

/**
 * A positive number in Japanese counters, to three significant figures.
 *
 * `1.38e10` → `138億`, `34000` → `3.4万`, `1868` → `1,868`, `0.25` → `0.25`. Past 垓 the counters
 * stop meaning anything to anyone, so it returns `null` and the caller falls back to `10ⁿ`.
 */
export function japaneseNumber(n: number): string | null {
  if (!(n > 0) || n >= 1e24) return null;
  for (const [size, name] of COUNTERS) {
    if (n >= size) {
      // `2,200兆` rather than `2200兆`: four digits read better with a separator.
      const count = +(n / size).toPrecision(3);
      return `${count >= 1000 ? count.toLocaleString("en-US") : count}${name}`;
    }
  }
  return n >= 1000 ? (+n.toPrecision(3)).toLocaleString("en-US") : sig(n);
}

/** `m × 10ⁿ`, for magnitudes no unit or counter covers. */
export function scientific(n: number): string {
  const exponent = Math.floor(Math.log10(n));
  const mantissa = +(n / 10 ** exponent).toPrecision(2);
  // `9.96e5` rounds to a mantissa of 10 — carry it into the exponent.
  if (mantissa >= 10) return powerOfTen(exponent + 1);
  return mantissa === 1
    ? powerOfTen(exponent)
    : `${mantissa}×${powerOfTen(exponent)}`;
}

/** `約138億年前`, or `現在` for zero. */
export function yearsAgo(years: number): string {
  if (years <= 0) return "現在";
  if (years < 1) {
    const months = Math.round(years * 12);
    return months <= 0 ? "現在" : `約${months}か月前`;
  }
  const jp = japaneseNumber(years);
  return jp === null ? `約${scientific(years)}年前` : `約${jp}年前`;
}

const LIGHT_YEAR = 9.4607e15;

/** Length units from the largest down. Each one covers from its size up to the next. */
const LENGTH_UNITS: [number, string][] = [
  [LIGHT_YEAR, "光年"],
  [1e3, "km"],
  [1, "m"],
  [1e-2, "cm"],
  [1e-3, "mm"],
  [1e-6, "µm"],
  [1e-9, "nm"],
  [1e-12, "pm"],
  [1e-15, "fm"],
];

/**
 * A length in meters, in the unit a person would reach for.
 *
 * `1.7` → `1.7 m`, `1.27e7` → `1.27万 km`, `8.8e26` → `930億 光年`, `1.6e-35` → `1.6×10⁻³⁵ m`.
 */
export function length(meters: number): string {
  if (!(meters > 0)) return "0 m";
  if (meters < 1e-15) return `${scientific(meters)} m`;
  for (const [size, unit] of LENGTH_UNITS) {
    if (meters >= size) {
      const jp = japaneseNumber(meters / size);
      return jp === null ? `${scientific(meters)} m` : `${jp} ${unit}`;
    }
  }
  return `${scientific(meters)} m`;
}

/** An amount of money: `1.4兆円`, `8,000万円`, `3円`. */
export function yen(amount: number): string {
  const jp = japaneseNumber(amount);
  return jp === null ? `${scientific(amount)}円` : `${jp}円`;
}
