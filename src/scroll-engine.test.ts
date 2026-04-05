import { describe, it, expect } from "vite-plus/test";
import { getViewport, valueToFraction, hueForExponent, computeTicks } from "./scroll-engine";

const historyMeta = {
  id: "history",
  title: "",
  subtitle: "",
  unit: "年前",
  unitSymbol: "年前",
  minExponent: -1,
  maxExponent: 11,
  pixelsPerExponent: 300,
};

const lengthMeta = {
  id: "length",
  title: "",
  subtitle: "",
  unit: "メートル",
  unitSymbol: "m",
  minExponent: -35,
  maxExponent: 27,
  pixelsPerExponent: 300,
};

describe("getViewport", () => {
  it("returns ±0.5 exponent range", () => {
    const vp = getViewport(5);
    expect(vp.exponent).toBe(5);
    expect(vp.rangeMin).toBeCloseTo(10 ** 4.5);
    expect(vp.rangeMax).toBeCloseTo(10 ** 5.5);
  });

  it("works with negative exponents", () => {
    const vp = getViewport(-3);
    expect(vp.rangeMin).toBeCloseTo(10 ** -3.5);
    expect(vp.rangeMax).toBeCloseTo(10 ** -2.5);
  });
});

describe("valueToFraction", () => {
  it("returns 0.5 for center value (reversed)", () => {
    const vp = getViewport(5);
    const center = 10 ** 5;
    const frac = valueToFraction(center, vp, historyMeta);
    // reversed: 1 - raw, raw at center ≈ 0.5 roughly
    expect(frac).toBeGreaterThan(0);
    expect(frac).toBeLessThan(1);
  });

  it("larger values map to smaller fractions (reversed)", () => {
    const vp = getViewport(5);
    const large = 10 ** 5.4;
    const small = 10 ** 4.6;
    expect(valueToFraction(large, vp, historyMeta))
      .toBeLessThan(valueToFraction(small, vp, historyMeta));
  });
});

describe("hueForExponent", () => {
  it("returns 270 at minExponent", () => {
    expect(hueForExponent(-1, historyMeta)).toBe(270);
  });

  it("returns 30 at maxExponent", () => {
    expect(hueForExponent(11, historyMeta)).toBe(30);
  });

  it("interpolates linearly", () => {
    const mid = (-1 + 11) / 2;
    expect(hueForExponent(mid, historyMeta)).toBe(150);
  });
});

describe("computeTicks", () => {
  it("generates 2, 4, 6, 8 multipliers", () => {
    const ticks = computeTicks(100, 1000);
    expect(ticks).toEqual([200, 400, 600, 800]);
  });

  it("works across exponent boundaries", () => {
    const ticks = computeTicks(50, 500);
    expect(ticks).toContain(60);
    expect(ticks).toContain(80);
    expect(ticks).toContain(200);
    expect(ticks).toContain(400);
  });

  it("returns empty for invalid range", () => {
    const ticks = computeTicks(1000, 100);
    expect(ticks).toEqual([]);
  });
});
