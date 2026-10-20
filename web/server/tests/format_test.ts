import { assertEquals } from "@std/assert";

import {
  japaneseNumber,
  length,
  powerOfTen,
  scientific,
  superscript,
  yearsAgo,
  yen,
} from "../../client/lib/format.ts";

Deno.test("superscript", () => {
  assertEquals(superscript("-35"), "⁻³⁵");
  assertEquals(powerOfTen(9), "10⁹");
});

Deno.test("japaneseNumber: counters to three significant figures", () => {
  assertEquals(japaneseNumber(1.38e10), "138億");
  assertEquals(japaneseNumber(4.5e9), "45億");
  assertEquals(japaneseNumber(3.4e4), "3.4万");
  assertEquals(japaneseNumber(1868), "1,870");
  assertEquals(japaneseNumber(55), "55");
  assertEquals(japaneseNumber(0.25), "0.25");
  assertEquals(japaneseNumber(1e25), null);
});

Deno.test("scientific: carries a rounded-up mantissa", () => {
  assertEquals(scientific(1.6e-35), "1.6×10⁻³⁵");
  assertEquals(scientific(1e-20), "10⁻²⁰");
  assertEquals(scientific(9.96e5), "10⁶");
});

Deno.test("yearsAgo", () => {
  assertEquals(yearsAgo(1.38e10), "約138億年前");
  assertEquals(yearsAgo(0), "現在");
  assertEquals(yearsAgo(0.5), "約6か月前");
  assertEquals(yearsAgo(15), "約15年前");
});

Deno.test("length picks a human unit", () => {
  assertEquals(length(1.7), "1.7 m");
  assertEquals(length(1.27e7), "1.27万 km");
  assertEquals(length(0.005), "5 mm");
  assertEquals(length(1e-10), "100 pm");
  assertEquals(length(1.6e-35), "1.6×10⁻³⁵ m");
  assertEquals(length(8.8e26), "930億 光年");
});

Deno.test("yen uses Japanese counters, with a separator past four digits", () => {
  assertEquals(yen(3), "3円");
  assertEquals(yen(2000), "2,000円");
  assertEquals(yen(4.5e4), "4.5万円");
  assertEquals(yen(8e7), "8,000万円");
  assertEquals(yen(1.4e12), "1.4兆円");
  assertEquals(yen(2.2e15), "2,200兆円");
});
