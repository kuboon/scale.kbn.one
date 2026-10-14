/**
 * An explorer page: one scale, as the whole screen.
 *
 * Both scales are this one page with different data, so instead of a module per page it is a
 * function from an axis to a page module — `server/router.tsx` calls it once per YAML file.
 */

import type { Handle } from "@remix-run/component";

import { Explorer } from "../islands/explorer.tsx";
import type { PageModule } from "../layout.tsx";
import type { Axis } from "../lib/scale.ts";

export function explorerPage(axis: Axis, description: string): PageModule {
  return {
    title: `${axis.title} — スケール探検`,
    description,
    hydrate: true,
    bare: true,
    themeColor: "#0d0716",
    // `viewport-fit=cover` so the backdrop reaches under the notch and `env(safe-area-inset-*)`
    // reports the insets the header and the panel pad themselves with.
    viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
    default: function ExplorerPage(_handle: Handle) {
      return () => <Explorer axis={axis} />;
    },
  };
}
