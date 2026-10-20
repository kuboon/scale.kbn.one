import { assert, assertEquals, assertStringIncludes } from "@std/assert";

import router from "../router.tsx";

async function get(path: string): Promise<Response> {
  return await router.fetch(new Request(`http://localhost${path}`));
}

Deno.test("the landing page links both scales and ships no script", async () => {
  const res = await get("/");
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, 'href="/history"');
  assertStringIncludes(html, 'href="/length"');
  assertStringIncludes(html, 'href="/money"');
  assert(!html.includes('type="module"'));
});

for (
  const [path, first] of [
    ["/history", "ビッグバン"],
    ["/length", "観測可能な宇宙"],
    ["/money", "普通国債の残高"],
  ]
) {
  Deno.test(`${path} renders every entry server-side and hydrates`, async () => {
    const res = await get(path);
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, first);
    assertStringIncludes(html, 'type="module"');
    assertStringIncludes(html, "viewport-fit=cover");
  });
}

Deno.test("static files and social cards are served", async () => {
  assertEquals((await get("/static/app.css")).status, 200);
  const og = await get("/og/history.png");
  assertEquals(og.status, 200);
  assertEquals(og.headers.get("content-type"), "image/png");
  await og.body?.cancel();
});
