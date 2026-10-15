/**
 * An explorer page: one scale, as the whole screen.
 *
 * Both scales are this one page with different data, so instead of a module per page it is a
 * function from an axis to a page module — `server/router.tsx` calls it once per YAML file.
 */

import type { Handle } from "@remix-run/component";

import { Explorer } from "../islands/explorer.tsx";
import { Fisheye } from "../islands/fisheye.tsx";
import type { PageModule } from "../layout.tsx";
import type { Axis } from "../lib/scale.ts";

/** Which explorer: the scrolling one, or the fisheye lens. */
export type ExplorerMode = "scroll" | "fisheye";

/**
 * @param altHref The same scale in the other mode, for the header's switch
 */
export function explorerPage(
  axis: Axis,
  description: string,
  mode: ExplorerMode,
  altHref: string,
): PageModule {
  return {
    title: mode === "fisheye"
      ? `${axis.title}（魚眼） — スケール探検`
      : `${axis.title} — スケール探検`,
    description,
    hydrate: true,
    bare: true,
    themeColor: "#0d0716",
    // `viewport-fit=cover` so the backdrop reaches under the notch and `env(safe-area-inset-*)`
    // reports the insets the header and the panel pad themselves with.
    viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
    default: function ExplorerPage(_handle: Handle) {
      return () =>
        mode === "fisheye"
          ? <Fisheye axis={axis} altHref={altHref} />
          : <Explorer axis={axis} altHref={altHref} />;
    },
  };
}
