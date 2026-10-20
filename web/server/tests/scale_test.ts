import { assert, assertAlmostEquals, assertEquals } from "@std/assert";

import {
  anchoredScroll,
  captionStep,
  clampDecadePx,
  logToY,
  placeCards,
  readout,
  swipeAxis,
  swipeFactor,
  toAxis,
  yToLog,
} from "../../client/lib/scale.ts";

const history = {
  meta: {
    id: "history",
    title: "宇宙史",
    subtitle: "",
    unit: "年前",
    unitSymbol: "年前",
    minExponent: 0,
    maxExponent: 9.8,
  },
  entries: [
    { exponent: 0, value: 0, name: "今", nameEn: "Now", description: "" },
    { ad: 1926, name: "昭和", nameEn: "Showa", description: "" },
    {
      exponent: 10,
      value: 1.38,
      name: "ビッグバン",
      nameEn: "Big Bang",
      description: "",
    },
  ],
};

Deno.test("toAxis sorts top to bottom and pins zero to the floor", () => {
  const axis = toAxis(history, 2026);
  assertEquals(axis.points.map((p) => p.nameEn), ["Big Bang", "Showa", "Now"]);
  assertEquals(axis.points[0].label, "約138億年前");
  assertEquals(axis.points[1].label, "1926年");
  assertAlmostEquals(axis.points[1].log, 2);
  assertEquals(axis.points[2].log, axis.lo);
  assertEquals(axis.points[2].label, "現在");
  assert(axis.hi > axis.points[0].log);
  assertEquals(axis.start, axis.points[0].log);
});

Deno.test("logToY and yToLog are inverses, and a zoom keeps the anchor put", () => {
  const y = logToY(3.3, 10, 200, 50);
  assertAlmostEquals(yToLog(y, 10, 200, 50), 3.3);
  const before = anchoredScroll(3.3, 300, 10, 200, 50);
  const after = anchoredScroll(3.3, 300, 10, 400, 50);
  assertAlmostEquals(logToY(3.3, 10, 400, 50) - after, 300);
  assert(before !== after);
});

Deno.test("clampDecadePx", () => {
  assertEquals(clampDecadePx(1, 10, 800), 64);
  assertEquals(clampDecadePx(1e9, 10, 800), 9600);
});

Deno.test("captionStep nests 1, 2, 5, 10", () => {
  assertEquals(captionStep(100), 1);
  assertEquals(captionStep(30), 2);
  assertEquals(captionStep(12), 5);
  assertEquals(captionStep(6), 10);
});

Deno.test("placeCards pushes, then drops what would drift too far", () => {
  const slots = placeCards([100, 105, 110, 400], [30, 30, 30, 30], {
    gap: 4,
    maxShift: 40,
  });
  assertEquals(slots.map((s) => s.visible), [true, true, false, true]);
  assertEquals(slots[0].top, 85);
  assertEquals(slots[1].top, 119);
});

Deno.test("placeCards always shows the pinned card", () => {
  const slots = placeCards([100, 105, 110], [30, 30, 30], { pinned: 2 });
  assert(slots[2].visible);
  assertEquals(slots[2].top, 95);
  assert(!slots[0].visible || slots[0].top + 30 + 4 <= 95);
});

Deno.test("readout", () => {
  assertEquals(readout("history", 9), "約10億年前");
  assertEquals(readout("length", 0), "約1 m");
});

Deno.test("a full-width swipe right zooms in ×10, left zooms out", () => {
  assertAlmostEquals(swipeFactor(390, 390), 10);
  assertAlmostEquals(swipeFactor(-195, 390), 1 / Math.sqrt(10));
  assertEquals(swipeFactor(0, 390), 1);
});

Deno.test("swipeAxis waits out the slop, then picks a side", () => {
  assertEquals(swipeAxis(3, 4), null);
  assertEquals(swipeAxis(20, 5), "zoom");
  assertEquals(swipeAxis(-20, 5), "zoom");
  assertEquals(swipeAxis(5, 20), "scroll");
  // A diagonal goes to the browser: scrolling is the default.
  assertEquals(swipeAxis(10, 10), "scroll");
});

Deno.test("money labels drop 約 only for exact amounts", () => {
  const axis = toAxis({
    meta: {
      id: "money",
      title: "お金",
      subtitle: "",
      unit: "円",
      unitSymbol: "円",
      minExponent: 0,
      maxExponent: 15,
    },
    entries: [
      {
        exponent: 3,
        value: 2,
        exact: true,
        name: "2000円札",
        nameEn: "",
        description: "",
      },
      { exponent: 4, value: 4.5, name: "救急車", nameEn: "", description: "" },
    ],
  }, 2026);
  assertEquals(axis.kind, "money");
  assertEquals(axis.points.map((p) => p.label), ["約4.5万円", "2,000円"]);
  assertEquals(axis.start, 4);
  assertEquals(readout("money", 12), "約1兆円");
});
