import { describe, it, expect } from "vite-plus/test";
import {
  getViewport,
  valueToFraction,
  fractionToValue,
  hueForExponent,
  computeTicks,
  niceStep,
  clampSpanExp,
  clampBottom,
  topValue,
  dominantAxis,
} from "./scroll-engine";

const historyMeta = {
  id: "history",
  title: "",
  subtitle: "",
  unit: "年前",
  unitSymbol: "年前",
  minExponent: 0,
  maxExponent: 9.8,
};

describe("getViewport", () => {
  it("spans 10^spanExp upward from the bottom edge", () => {
    const vp = getViewport(3, 0);
    expect(vp.span).toBeCloseTo(1000);
    expect(vp.bottom).toBe(0);
    expect(vp.top).toBeCloseTo(1000);
  });

  it("keeps the bottom edge fixed while zooming — 0-1000 becomes 0-100", () => {
    const wide = getViewport(3, 0);
    const zoomed = getViewport(2, wide.bottom);
    expect(zoomed.bottom).toBe(0);
    expect(zoomed.top).toBeCloseTo(100);
  });

  it("offsets both edges when panned", () => {
    const vp = getViewport(2, 500);
    expect(vp.bottom).toBe(500);
    expect(vp.top).toBeCloseTo(600);
  });
});

describe("valueToFraction", () => {
  it("is linear, not logarithmic", () => {
    const vp = getViewport(3, 0); // 0 – 1000
    expect(valueToFraction(1000, vp)).toBeCloseTo(0); // top
    expect(valueToFraction(500, vp)).toBeCloseTo(0.5); // exact midpoint
    expect(valueToFraction(0, vp)).toBeCloseTo(1); // bottom
  });

  it("puts larger values nearer the top", () => {
    const vp = getViewport(3, 0);
    expect(valueToFraction(900, vp)).toBeLessThan(valueToFraction(100, vp));
  });

  it("round-trips through fractionToValue", () => {
    const vp = getViewport(4, 2000);
    for (const value of [2000, 5000, 12000]) {
      expect(fractionToValue(1 - valueToFraction(value, vp), vp)).toBeCloseTo(value);
    }
  });
});

describe("clampSpanExp", () => {
  it("clamps to minExponent", () => {
    expect(clampSpanExp(-5, historyMeta)).toBe(0);
  });

  it("allows headroom above maxExponent so the top entry stays reachable", () => {
    expect(clampSpanExp(99, historyMeta)).toBeCloseTo(10.3);
    expect(10 ** clampSpanExp(99, historyMeta)).toBeGreaterThan(1.38e10);
  });
});

describe("clampBottom", () => {
  it("never goes below zero", () => {
    expect(clampBottom(-500, 1000, historyMeta)).toBe(0);
  });

  it("keeps the top edge inside the scale", () => {
    const span = 1000;
    expect(clampBottom(Infinity, span, historyMeta)).toBeCloseTo(topValue(historyMeta) - span);
  });

  it("pins to zero when fully zoomed out", () => {
    expect(clampBottom(1e9, topValue(historyMeta), historyMeta)).toBe(0);
  });
});

describe("niceStep", () => {
  it("picks 1, 2 or 5 × 10ⁿ", () => {
    expect(niceStep(1000, 5)).toBe(200);
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(1000, 10)).toBe(100);
    expect(niceStep(1000, 2)).toBe(500);
  });

  it("works on tiny spans", () => {
    expect(niceStep(1e-34, 5)).toBeCloseTo(2e-35);
  });

  it("returns zero for a degenerate span", () => {
    expect(niceStep(0, 5)).toBe(0);
  });
});

describe("computeTicks", () => {
  it("generates round linear graduations", () => {
    expect(computeTicks(getViewport(3, 0), 5)).toEqual([0, 200, 400, 600, 800, 1000]);
  });

  it("re-labels one decade in — the 0-1000 ruler becomes 0-100", () => {
    expect(computeTicks(getViewport(2, 0), 5)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("starts from the first round value above a panned bottom edge", () => {
    expect(computeTicks(getViewport(2, 450), 5)).toEqual([460, 480, 500, 520, 540]);
  });

  it("avoids float noise from repeated multiplication", () => {
    expect(computeTicks(getViewport(0, 0), 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
});

describe("hueForExponent", () => {
  it("returns 270 at minExponent", () => {
    expect(hueForExponent(0, historyMeta)).toBe(270);
  });

  it("returns 30 at maxExponent", () => {
    expect(hueForExponent(9.8, historyMeta)).toBeCloseTo(30);
  });

  it("clamps beyond the declared range", () => {
    expect(hueForExponent(-5, historyMeta)).toBe(270);
    expect(hueForExponent(50, historyMeta)).toBe(30);
  });
});

describe("dominantAxis", () => {
  it("treats a mostly-sideways drag as horizontal", () => {
    expect(dominantAxis(100, -20)).toBe("horizontal");
  });

  it("treats a mostly-vertical drag as vertical", () => {
    expect(dominantAxis(20, -100)).toBe("vertical");
  });

  it("favours vertical on a perfect diagonal", () => {
    expect(dominantAxis(50, 50)).toBe("vertical");
  });
});
