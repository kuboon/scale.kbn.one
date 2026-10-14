/**
 * Every URL the site answers, in one place.
 *
 * `server/router.tsx` maps these to what answers them, and everything that links reads
 * `routes.history.href()` rather than rebuilding `${base}/history` at each call site. The map is
 * built on the deploy prefix, so hrefs are right under a PR preview's sub-path too.
 */

import { get, route } from "@remix-run/fetch-router/routes";

import { base } from "./base.ts";

export const routes = route(base, {
  home: get("/"),
  history: get("/history"),
  length: get("/length"),
});
