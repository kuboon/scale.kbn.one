/**
 * The deploy prefix, computed once — on both sides.
 *
 * Every URL the site emits carries this, and no output path does. The Pages workflow passes the
 * full public URL in `BASE_URL`; locally it is unset and the site is served from the root.
 *
 * Only the static build has a prefix. The dev server is always served from its own origin's root,
 * so the `dev` permission set ignores `BASE_URL` and the prefix is empty there.
 *
 * Where it comes from depends on who is asking, and that is the whole of this file:
 *
 * - **On the server**, from `BASE_URL`, read off `globalThis` rather than through `Deno.env`
 *   because nothing in `client/` is type-checked with `deno.ns` — a file here may not name a
 *   runtime the browser does not have.
 * - **In the browser**, from the `<meta>` the shell writes, because there is no environment to
 *   read and the prefix is not guessable from the URL: `/repo/preview/blog` and `/blog` are the
 *   same page under two deploys.
 *
 * ## Why the import is `/base` and not `/site`
 *
 * Both export `normalizeBase`, but `/site` is the Deno half of that package — the file trees,
 * the loader, `node:path` — so a module the browser is given cannot reach for it without pulling
 * Node built-ins into the bundle. `/base` is three string functions and no imports at all.
 */

import { normalizeBase } from "@remix-kbn/ssg/base";

/** The two runtimes this runs in: one has an environment, the other has a document. */
type Host = {
  Deno?: { env: { get(key: string): string | undefined } };
  document?: {
    querySelector(
      selectors: string,
    ): { getAttribute(name: string): string | null } | null;
  };
};

/** The `<meta name>` the shell writes the prefix into, for the browser to read back. */
export const BASE_META_NAME = "rmx-base";

/** URL path prefix the site is mounted under, without a trailing slash (e.g. `''` or `/repo`). */
export const base: string = normalizeBase(
  (globalThis as Host).Deno?.env.get("BASE_URL") ??
    (globalThis as Host).document
      ?.querySelector(`meta[name="${BASE_META_NAME}"]`)
      ?.getAttribute("content"),
);
