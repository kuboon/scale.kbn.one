export function superscript(s: string): string {
  const map: Record<string, string> = {
    "0": "\u2070",
    "1": "\u00B9",
    "2": "\u00B2",
    "3": "\u00B3",
    "4": "\u2074",
    "5": "\u2075",
    "6": "\u2076",
    "7": "\u2077",
    "8": "\u2078",
    "9": "\u2079",
    "-": "\u207B",
    "+": "\u207A",
  };
  return s
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

/**
 * Convert value × 10^exponent to a Japanese number label with unitSymbol.
 * e.g., (3.4, 4, "年前") → "約3万4千年前"
 *       (1.38, 10, "年前") → "約138億年前"
 *       (1.6, -35, "m") → "約1.6×10⁻³⁵ m"
 */
export function toJapaneseLabel(value: number, exponent: number, unitSymbol: string): string {
  if (value === 0) return "現在";

  const num = value * 10 ** exponent;

  if (num < 1) {
    const e = Math.floor(Math.log10(num));
    const v = +(num / 10 ** e).toPrecision(3);
    const vStr = v === 1 ? "" : `${v}×`;
    return `約${vStr}10${superscript(String(e))} ${unitSymbol}`;
  }

  const formatted = formatJapaneseNumber(value, exponent);
  const space = /^[a-zA-Z]/.test(unitSymbol) ? " " : "";
  return `約${formatted}${space}${unitSymbol}`;
}

/**
 * Human-readable label for a given 10^exp value in the specified scale.
 * Used by the indicator HUD.
 */
export function humanReadable(exp: number, scaleId: string): string {
  if (scaleId === "history") return humanReadableHistory(exp);
  return humanReadableLength(exp);
}

function humanReadableHistory(exp: number): string {
  if (exp <= 0) return "現在";
  return `約${formatJapaneseNumber(1, exp)}年前`;
}

function humanReadableLength(exp: number): string {
  const units: [number, string][] = [
    [16, "光年"],
    [3, "km"],
    [0, "m"],
    [-2, "cm"],
    [-3, "mm"],
    [-6, "\u00B5m"],
    [-9, "nm"],
    [-12, "pm"],
    [-15, "fm"],
  ];
  for (const [base, unit] of units) {
    if (exp >= base) {
      const shifted = exp - base;
      if (shifted === 0) return `1 ${unit}`;
      return `${formatJapaneseNumber(1, shifted)} ${unit}`;
    }
  }
  return "";
}

function formatSmallNumber(n: number): string {
  if (n >= 1000 && n % 1000 === 0) {
    return `${n / 1000}千`;
  }
  return n.toLocaleString();
}

function formatJapaneseNumber(value: number, exponent: number): string {
  const valStr = value.toString();
  const dotIdx = valStr.indexOf(".");
  let digits: string;
  let totalExp: number;
  if (dotIdx === -1) {
    digits = valStr;
    totalExp = exponent;
  } else {
    const decimals = valStr.length - dotIdx - 1;
    digits = valStr.replace(".", "");
    totalExp = exponent - decimals;
  }
  if (totalExp > 0) {
    digits = digits + "0".repeat(totalExp);
  } else if (totalExp < 0) {
    const num = value * 10 ** exponent;
    return num < 1 ? String(num) : Math.round(num).toLocaleString();
  }
  digits = digits.replace(/^0+/, "") || "0";

  const len = digits.length;
  const groups: [number, string][] = [
    [21, "垓"],
    [17, "京"],
    [13, "兆"],
    [9, "億"],
    [5, "万"],
  ];

  let result = "";
  let pos = 0;
  for (const [minLen, name] of groups) {
    if (len >= minLen) {
      const groupDigits = digits.slice(pos, len - (minLen - 1));
      const count = parseInt(groupDigits, 10);
      if (count > 0) {
        result += formatSmallNumber(count) + name;
      }
      pos = len - (minLen - 1);
    }
  }

  if (pos < len) {
    const rest = parseInt(digits.slice(pos), 10);
    if (rest > 0) {
      if (result) {
        result += formatSmallNumber(rest);
      } else {
        result = rest.toLocaleString();
      }
    }
  }

  return result || digits;
}
