/**
 * The explorers' look, shared by the scrolling explorer (`explorer.tsx`) and the fisheye one
 * (`fisheye.tsx`): palette, header, cards, dots, captions, the reading panel.
 *
 * A plain `.ts` module rather than an island — `assets.ts` bundles `islands/*.tsx` as entry
 * points, and this is not one.
 */

import { css } from "@remix-run/component";

/** x of the axis line, px from the left. Captions sit to its left, cards to its right. */
export const AXIS_X = 78;
/** Where the scrolling explorer's reticle sits, as a fraction of the screen height. */
export const RETICLE = 0.38;

export const ink = "rgb(255 255 255 / 0.92)";
export const faint = "rgb(255 255 255 / 0.55)";
export const glass = "hsl(var(--hue) 35% 14% / 0.82)";
export const accent = "hsl(calc(var(--hue) + 40) 90% 72%)";
export const safeTop = "env(safe-area-inset-top, 0px)";
export const safeBottom = "env(safe-area-inset-bottom, 0px)";

/** `vector-effect` is not inherited, so every line carries it — or a tall tile smears them. */
export const STROKE = "vector-effect='non-scaling-stroke'";

/** One decade of graduations — a major at the top, 2…9 at their log positions below it. */
export const tile = (fine: boolean) => {
  const minors = fine
    ? [9, 8, 7, 6, 5, 4, 3, 2].map((k) => {
      const yy = (100 * (1 - Math.log10(k))).toFixed(2);
      return `<line x1='5' x2='10' y1='${yy}' y2='${yy}' ${STROKE}/>`;
    }).join("")
    : "";
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 100' " +
    "preserveAspectRatio='none' stroke='white' stroke-opacity='0.6'>" +
    `<line x1='0' x2='10' y1='0.5' y2='0.5' ${STROKE} stroke-width='1.5'/>` +
    `${minors}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export const rootStyle = css({
  position: "relative",
  color: ink,
  fontFamily: "var(--font-sans)",
  // Every touch on the scale is either a vertical scroll or one of ours: no browser zoom, no
  // sideways drift, no double-tap-to-zoom delay.
  touchAction: "pan-y",
  overflowAnchor: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTapHighlightColor: "transparent",
  "& button": { font: "inherit", color: "inherit" },
});

export const backdropStyle = css({
  position: "fixed",
  inset: 0,
  zIndex: -1,
  background:
    "radial-gradient(120% 80% at 30% 38%, hsl(var(--hue) 45% 16%), hsl(var(--hue) 50% 5%))",
  transition: "background 400ms linear",
});

export const contentStyle = css({
  "--pad-top": "38lvh",
  "--pad-bottom": "62lvh",
  position: "relative",
  overflow: "hidden",
});

export const rulerStyle = css({
  position: "absolute",
  left: `${AXIS_X - 10}px`,
  width: "12px",
  borderRight: `2px solid ${faint}`,
  backgroundImage: tile(false),
  backgroundSize: "10px var(--decade)",
  backgroundRepeat: "repeat-y",
  "&[data-fine]": { backgroundImage: tile(true) },
});

export const captionStyle = css({
  position: "absolute",
  right: `calc(100% - ${AXIS_X - 14}px)`,
  transform: "translateY(-50%)",
  textAlign: "right",
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  "& b": { display: "block", fontSize: "0.85rem", fontWeight: 600 },
  "& span": { display: "block", fontSize: "0.62rem", color: faint },
  "&[hidden]": { display: "none" },
});

export const dotStyle = css({
  position: "absolute",
  left: `${AXIS_X + 1 - 6}px`,
  width: "12px",
  height: "12px",
  marginTop: "-6px",
  padding: 0,
  border: `2px solid ${ink}`,
  borderRadius: "50%",
  background: "hsl(var(--hue) 50% 10%)",
  cursor: "pointer",
  "&[data-focus]": { background: accent, borderColor: accent, scale: "1.3" },
});

export const cardStyle = css({
  position: "absolute",
  left: `${AXIS_X + 22}px`,
  right: "48px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "1px",
  marginTop: "-1.3rem",
  padding: "0.3rem 0.6rem",
  textAlign: "left",
  border: "1px solid rgb(255 255 255 / 0.16)",
  borderRadius: "0.5rem",
  background: "rgb(255 255 255 / 0.06)",
  cursor: "pointer",
  transition: "opacity 160ms",
  willChange: "transform",
  "&[data-hidden]": { opacity: 0, pointerEvents: "none" },
  "&[data-focus]": {
    borderColor: accent,
    background: "rgb(255 255 255 / 0.12)",
  },
  // Before the script has laid the cards out they sit centred on their anchors and may overlap.
  "[data-ready] &": { marginTop: 0 },
});

export const leaderStyle = css({
  position: "absolute",
  left: 0,
  top: 0,
  width: "1px",
  height: "1px",
  overflow: "visible",
  pointerEvents: "none",
  "& path": { fill: "none", stroke: faint, strokeWidth: 1 },
  "[data-focus] > & path": { stroke: accent },
});

export const cardLabelStyle = css({
  fontSize: "0.7rem",
  color: accent,
  whiteSpace: "nowrap",
});

export const cardNameStyle = css({
  fontSize: "0.88rem",
  fontWeight: 600,
  lineHeight: 1.25,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const headerStyle = css({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: `calc(${safeTop} + 0.4rem) 0.6rem 0.6rem`,
  background: "linear-gradient(hsl(var(--hue) 50% 6% / 0.95) 60%, transparent)",
  pointerEvents: "none",
  "& > *": { pointerEvents: "auto" },
});

export const backStyle = css({
  color: ink,
  textDecoration: "none",
  fontSize: "1.3rem",
  padding: "0 0.4rem",
});

export const titleStyle = css({
  flex: 1,
  minWidth: 0,
  "& h1": { margin: 0, fontSize: "1rem", lineHeight: 1.3 },
  "& p": {
    margin: 0,
    fontSize: "0.7rem",
    color: faint,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

export const zoomButtonsStyle = css({
  display: "flex",
  gap: "0.35rem",
  "& button": {
    width: "2.4rem",
    height: "2.4rem",
    fontSize: "1.3rem",
    lineHeight: 1,
    border: `1px solid rgb(255 255 255 / 0.25)`,
    borderRadius: "50%",
    background: glass,
    cursor: "pointer",
    touchAction: "manipulation",
  },
});

export const reticleStyle = css({
  position: "fixed",
  left: 0,
  right: "40px",
  top: `${RETICLE * 100}%`,
  height: 0,
  borderTop: `1px dashed ${accent}`,
  pointerEvents: "none",
});

export const readoutStyle = css({
  position: "absolute",
  left: "0.4rem",
  bottom: "0.25rem",
  zIndex: 1,
  padding: "0.05rem 0.45rem",
  borderRadius: "0.4rem",
  background: glass,
  fontSize: "0.8rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: accent,
});

export const powerStyle = css({
  position: "absolute",
  left: "0.85rem",
  top: "0.2rem",
  zIndex: 1,
  fontSize: "0.6rem",
  color: faint,
  fontVariantNumeric: "tabular-nums",
});

export const railStyle = css({
  position: "fixed",
  right: 0,
  width: "40px",
  top: `calc(${safeTop} + 3.6rem)`,
  bottom: `calc(${safeBottom} + 8.5rem)`,
  borderLeft: "1px solid rgb(255 255 255 / 0.12)",
  background: "rgb(0 0 0 / 0.18)",
  touchAction: "none",
  cursor: "ns-resize",
  "&[data-active]": { background: "rgb(255 255 255 / 0.08)" },
});

export const railLabelStyle = css({
  position: "absolute",
  right: "4px",
  transform: "translateY(-50%)",
  fontSize: "0.58rem",
  color: faint,
  pointerEvents: "none",
});

export const thumbStyle = css({
  position: "absolute",
  left: "2px",
  width: "5px",
  minHeight: "3px",
  borderRadius: "3px",
  background: ink,
  pointerEvents: "none",
});

export const railMarkStyle = css({
  position: "absolute",
  left: 0,
  right: 0,
  height: 0,
  borderTop: `2px solid ${accent}`,
  pointerEvents: "none",
});

export const detailStyle = css({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  minHeight: `calc(${safeBottom} + 7.5rem)`,
  maxHeight: "40vh",
  overflowY: "auto",
  padding: `0.7rem 1rem calc(${safeBottom} + 0.8rem)`,
  background: glass,
  borderTop: "1px solid rgb(255 255 255 / 0.15)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  "& small": { display: "block", color: accent, fontSize: "0.8rem" },
  "& h2": { margin: "0.1rem 0 0", fontSize: "1.15rem", lineHeight: 1.3 },
  "& span": { display: "block", color: faint, fontSize: "0.8rem" },
  "& p": { margin: "0.35rem 0 0", fontSize: "0.9rem", lineHeight: 1.5 },
  "& > p:first-child": { margin: 0, color: faint, fontSize: "0.85rem" },
  "&[data-empty] > :not(:first-child)": { display: "none" },
  "&:not([data-empty]) > :first-child": { display: "none" },
});

/** The header's switch between the scrolling and fisheye explorers. */
export const modeLinkStyle = css({
  padding: "0.3rem 0.7rem",
  border: "1px solid rgb(255 255 255 / 0.25)",
  borderRadius: "999px",
  background: glass,
  color: ink,
  fontSize: "0.8rem",
  textDecoration: "none",
  whiteSpace: "nowrap",
});
