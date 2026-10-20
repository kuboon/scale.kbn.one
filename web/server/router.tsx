/**
 * The site, wired by hand.
 *
 * Route definitions live in `client/routes.ts`; this file maps them to what answers them. The
 * export is a plain `@remix-run/fetch-router` router, and it is deployed by `@remix-kbn/ssg`
 * crawling it with `fetch()` from `entryPoints` and writing each response to disk for GitHub
 * Pages. `deno task dev` serves the same router live.
 */

import {
  createController,
  createRouter,
  type RouterContext,
} from "@remix-run/fetch-router";
import { render } from "@remix-run/render-middleware";
import { createFileTree, githubPages } from "@remix-kbn/ssg/site";
import type { FileServerBehavior } from "@remix-kbn/ssg/site";

import { assets, assetsPath } from "./assets.ts";
import { clientRuntime } from "./runtime.ts";
import { scales } from "./data.ts";
import { ogImage, ogPaths, serveOgImage } from "./og/mod.ts";
import { base } from "../client/base.ts";
import { Layout, type PageModule } from "../client/layout.tsx";
import { routes } from "../client/routes.ts";

import * as Home from "../client/pages/index.tsx";
import { explorerPage } from "../client/pages/explorer.tsx";

/** Deploy path prefix. The build strips it back off when writing, so output lands at the root. */
export { base };

/** Where the static build deploys. The build writes the file this rule would serve. */
export const fileServer: FileServerBehavior = githubPages();

/** Renders a page module into the shell, with a social card drawn from its title. */
function pageAction(route: { href(): string }, page: PageModule) {
  const image = ogImage(route.href(), page);
  const Page = page.default;

  return (context: AppContext): Response =>
    context.render(
      <Layout
        title={page.title}
        description={page.description}
        image={image}
        viewport={page.viewport}
        bare={page.bare}
        themeColor={page.themeColor}
        script={page.hydrate ? clientRuntime : null}
      >
        <Page />
      </Layout>,
    );
}

/** The files under `client/static/`, served verbatim at their own names. */
const staticFiles = await createFileTree({
  rootDir: `${import.meta.dirname}/../client/static`,
  basePath: `${base}/static`,
  cacheControl: "public, max-age=3600",
});

const router = createRouter({ middleware: [render({ assets })] });

export type AppContext = RouterContext<typeof router>;

declare module "@remix-run/fetch-router" {
  interface RouterTypes {
    context: AppContext;
  }
}

const pages = createController(routes, {
  actions: {
    home: pageAction(routes.home, Home),
    history: pageAction(
      routes.history,
      explorerPage(
        scales.history,
        "ビッグバンから現在まで、138億年を対数のものさしで。",
      ),
    ),
    length: pageAction(
      routes.length,
      explorerPage(
        scales.length,
        "プランク長から観測可能な宇宙まで、63桁を対数のものさしで。",
      ),
    ),
    money: pageAction(
      routes.money,
      explorerPage(
        scales.money,
        "1円玉の製造費から日本中の家計が持つお金の合計まで、16桁のお金を対数のものさしで。",
      ),
    ),
  },
});

router.map(routes, pages);
router.get(`${base}/static/*path`, ({ request }) => staticFiles.fetch(request));
router.get(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));
router.get(`${base}/og/*path`, ({ request }) => serveOgImage(request));

/**
 * Where the static crawl starts. Pages are reached by following links from `/`; the social cards
 * are linked from nowhere a crawler follows, so they are listed.
 */
export const entryPoints: readonly string[] = ["/", ...ogPaths()];

export default router;
