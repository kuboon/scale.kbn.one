import { assert, assertAlmostEquals, assertEquals } from "@std/assert";

import {
  bend,
  focusScale,
  type Lens,
  lensFor,
  localScale,
  project,
  unbend,
  unproject,
} from "../../client/lib/fisheye.ts";

const lens: Lens = { focus: 5, m: 20, span: 10, half: 300 };

Deno.test("bend keeps the ends fixed and unbend undoes it", () => {
  for (const m of [0, 1, 50]) {
    assertEquals(bend(1, m), 1);
    assertEquals(bend(-1, m), -1);
    assertEquals(bend(0, m), 0);
    for (const x of [-0.7, -0.1, 0.02, 0.4]) {
      assertAlmostEquals(unbend(bend(x, m), m), x);
    }
  }
  assertEquals(bend(0.3, 0), 0.3);
});

Deno.test("project: focus at 0, larger values above, everything within the stage", () => {
  assertEquals(project(5, lens), 0);
  assert(project(6, lens) < 0);
  assert(project(4, lens) > 0);
  assertEquals(project(15, lens), -300);
  assertEquals(project(-100, lens), 300);
  assertAlmostEquals(unproject(project(5.37, lens), lens), 5.37);
});

Deno.test("focusScale and lensFor agree, and the lens squeezes the far field", () => {
  assertAlmostEquals(focusScale(lens), 630);
  assertAlmostEquals(lensFor(630, 10, 300), 20);
  assertEquals(lensFor(1, 10, 300), 0);
  assertAlmostEquals(localScale(5, lens), focusScale(lens));
  assert(localScale(8, lens) < focusScale(lens) / 10);
});
