import { describe, it, expect } from "vite-plus/test";
import { superscript, toJapaneseLabel, humanReadable } from "./format";

describe("superscript", () => {
  it("converts digits to superscript", () => {
    expect(superscript("0")).toBe("\u2070");
    expect(superscript("123")).toBe("\u00B9\u00B2\u00B3");
  });

  it("converts minus sign", () => {
    expect(superscript("-35")).toBe("\u207B\u00B3\u2075");
  });
});

describe("toJapaneseLabel", () => {
  it("returns 現在 for value 0", () => {
    expect(toJapaneseLabel(0, 0, "年前")).toBe("現在");
  });

  it("formats large history values", () => {
    expect(toJapaneseLabel(1.38, 10, "年前")).toBe("約138億年前");
    expect(toJapaneseLabel(46, 8, "年前")).toBe("約46億年前");
    expect(toJapaneseLabel(2.3, 8, "年前")).toBe("約2億3千万年前");
    expect(toJapaneseLabel(3.4, 4, "年前")).toBe("約3万4千年前");
  });

  it("formats small values with exponential notation", () => {
    const label = toJapaneseLabel(1.6, -35, "m");
    expect(label).toMatch(/^約1\.6×10.+ m$/);
  });

  it("adds space before Latin unit symbols", () => {
    expect(toJapaneseLabel(1, 0, "m")).toBe("約1 m");
    expect(toJapaneseLabel(1, 0, "年前")).toBe("約1年前");
  });
});

describe("humanReadable", () => {
  describe("history", () => {
    it("returns 現在 for exp <= 0", () => {
      expect(humanReadable(0, "history")).toBe("現在");
      expect(humanReadable(-1, "history")).toBe("現在");
    });

    it("formats various exponents", () => {
      expect(humanReadable(1, "history")).toBe("約10年前");
      expect(humanReadable(2, "history")).toBe("約100年前");
      expect(humanReadable(4, "history")).toBe("約1万年前");
      expect(humanReadable(8, "history")).toBe("約1億年前");
      expect(humanReadable(10, "history")).toBe("約100億年前");
    });
  });

  describe("length", () => {
    it("formats metric units", () => {
      expect(humanReadable(0, "length")).toBe("1 m");
      expect(humanReadable(3, "length")).toBe("1 km");
      expect(humanReadable(-3, "length")).toBe("1 mm");
      expect(humanReadable(-6, "length")).toBe("1 µm");
      expect(humanReadable(-9, "length")).toBe("1 nm");
    });

    it("formats shifted values", () => {
      expect(humanReadable(1, "length")).toBe("10 m");
      expect(humanReadable(5, "length")).toBe("100 km");
      expect(humanReadable(8, "length")).toBe("10万 km");
      expect(humanReadable(16, "length")).toBe("1 光年");
    });

    it("returns empty for very small exponents", () => {
      expect(humanReadable(-16, "length")).toBe("");
    });
  });
});
