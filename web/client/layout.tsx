/**
 * The document shell.
 *
 * A component like any other: a setup function returning a render function, placed as
 * `<Layout title={…}>…</Layout>`. What turns the tree into a response is `context.render` from the
 * `render({ assets })` middleware in `server/router.tsx` — `renderToStream`, which is what keeps a
 * plain `<a href>` working on a page with islands.
 *
 * Two kinds of page go through it: documents (the landing page) get a header and a footer, and app
 * screens (the explorers) set `bare` and are the whole of `<body>`.
 *
 * `static/app.css` is linked first in `<head>` because it names the cascade layers, and layers
 * rank by where they are first named; Remix appends its collected `css(...)` rules just before
 * `</head>`.
 */

import { css, type Handle, type RemixNode } from "@remix-run/component";

import { base, BASE_META_NAME } from "./base.ts";
import { routes } from "./routes.ts";
import { color, contentWidth } from "./tokens.ts";

/** Where the client runtime lives, and what it pulls in behind it. */
export interface ClientRuntime {
  src: string;
  /** The chunks it imports, for `<link rel="modulepreload">`. */
  preloads: readonly string[];
}

/** What every page hands the shell. */
export interface LayoutProps {
  title: string;
  description?: string;
  /** The page's social card URL, from `server/og/`. `null` where there is none. */
  image: string | null;
  /** A viewport meta of the page's own — `viewport-fit=cover` for a full-screen app. */
  viewport?: string;
  /** Render the page as the whole of `<body>`, with no header or footer. */
  bare?: boolean;
  /**
   * The client runtime, for a page that places an island; `null` for one that ships no
   * JavaScript. Required so that forgetting it is a type error rather than a page whose islands
   * silently never hydrate.
   */
  script: ClientRuntime | null;
  /** The `<meta name="theme-color">`, for a page with a background of its own. */
  themeColor?: string;
  children: RemixNode;
}

/** What a page module exports: a component, plus what the shell needs to frame it. */
export interface PageModule {
  default: (handle: Handle) => () => RemixNode;
  title: string;
  description?: string;
  /** Whether the page places a client entry, so the shell boots the runtime for it. */
  hydrate: boolean;
  viewport?: string;
  bare?: boolean;
  themeColor?: string;
}

export function Layout(handle: Handle<LayoutProps>) {
  return () => {
    const props = handle.props;
    return (
      <html lang="ja">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content={props.viewport ?? "width=device-width, initial-scale=1"}
          />
          <title>{props.title}</title>
          {props.description
            ? <meta name="description" content={props.description} />
            : null}
          {props.themeColor
            ? <meta name="theme-color" content={props.themeColor} />
            : null}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={props.title} />
          {props.description
            ? <meta property="og:description" content={props.description} />
            : null}
          {props.image
            ? (
              <>
                <meta property="og:image" content={props.image} />
                <meta name="twitter:card" content="summary_large_image" />
              </>
            )
            : null}
          {/* The deploy prefix, for the browser — see `client/base.ts`. */}
          <meta name={BASE_META_NAME} content={base} />
          <link rel="stylesheet" href={`${base}/static/app.css`} />
          <link
            rel="icon"
            type="image/svg+xml"
            href={`${base}/static/favicon.svg`}
          />
          {(props.script?.preloads ?? []).map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
        </head>
        <body>
          {props.bare ? props.children : <Shell>{props.children}</Shell>}
          {props.script
            ? <script type="module" src={props.script.src}></script>
            : null}
        </body>
      </html>
    );
  };
}

/** The header and footer around a document page. */
function Shell(handle: Handle<{ children: RemixNode }>) {
  return () => (
    <>
      <header mix={[bandStyle, headerStyle]}>
        <a mix={brandStyle} href={routes.home.href()}>スケール探検</a>
        <nav mix={navStyle}>
          <a href={routes.history.href()}>宇宙史</a>
          <a href={routes.length.href()}>長さ</a>
        </nav>
      </header>
      <main mix={[bandStyle, mainStyle]}>{handle.props.children}</main>
      <footer mix={[bandStyle, footerStyle]}>
        <p>
          <a href="https://github.com/kuboon/scale.kbn.one">Source</a>{" "}
          (MIT) · Built with <a href="https://remix.run">Remix v3</a> on{" "}
          <a href="https://deno.com">Deno</a>
        </p>
      </footer>
    </>
  );
}

// --- styles -----------------------------------------------------------------

/** The measure the header, the main column and the footer all share. */
const bandStyle = css({
  width: "100%",
  maxWidth: contentWidth,
  marginInline: "auto",
  paddingInline: "1.25rem",
});

const headerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
  paddingBlock: "1.25rem",
  borderBottom: `1px solid ${color.border}`,
});

const brandStyle = css({
  fontWeight: 700,
  fontSize: "1.1rem",
  textDecoration: "none",
  color: color.fg,
});

const navStyle = css({ display: "flex", gap: "1rem" });

const mainStyle = css({ paddingBlock: "2rem" });

const footerStyle = css({
  paddingBlock: "1.5rem",
  borderTop: `1px solid ${color.border}`,
  color: color.muted,
  fontSize: "0.85rem",
});
