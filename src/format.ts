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

  const formatted = formatJapaneseNumber(num);
  const space = /^[a-zA-Z]/.test(unitSymbol) ? " " : "";
  return `約${formatted}${space}${unitSymbol}`;
}

function formatSmallNumber(n: number): string {
  if (n >= 1000 && n % 1000 === 0) {
    return `${n / 1000}千`;
  }
  return n.toLocaleString();
}

function formatJapaneseNumber(num: number): string {
  num = Math.round(num);
  if (num < 10000) return num.toLocaleString();

  const groups: [number, string][] = [
    [1e12, "兆"],
    [1e8, "億"],
    [1e4, "万"],
  ];

  let result = "";
  let remaining = num;

  for (const [divisor, name] of groups) {
    const count = Math.floor(remaining / divisor);
    if (count > 0) {
      result += formatSmallNumber(count) + name;
      remaining = remaining % divisor;
    }
  }

  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    result += `${thousands}千`;
  }

  return result;
}
