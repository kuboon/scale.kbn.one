/**
 * The fisheye explorer: the whole scale is always on screen, magnified around the reticle.
 *
 * The scrolling explorer (`explorer.tsx`) shows a window onto the axis and leaves where you are in
 * the whole to the rail. This one shows the whole every time, bent by a lens (`lib/fisheye.ts`):
 * the decades near the reticle are spread wide enough to read, and the rest are squeezed toward
 * the top and bottom edges rather than scrolled off them. There is no zoom to get lost in — only
 * how strong the lens is.
 *
 * - **Drag** moves the focus (with inertia). The lens moves with it, so whatever you drag past
 *   swells as it nears the reticle and shrinks as it leaves.
 * - **Pinch**, **Ctrl + wheel**, `−` `+` change the lens strength `m`.
 * - **Double tap** brings the tapped point to the reticle and doubles the lens.
 * - **Tap a card** to bring it to the reticle.
 *
 * Nothing scrolls: the page is one fixed stage and every touch is ours (`touch-action: none`).
 * Positions are recomputed per frame — every dot, card and caption gets a `top` from `project()`;
 * the ruler is drawn on a canvas, since its spacing is no longer a repeating tile.
 */

import { clientEntry, css, type Handle, on, ref } from "@remix-run/component";

import {
  bend,
  focusScale,
  type Lens,
  lensFor,
  localScale,
  project,
  unproject,
} from "../lib/fisheye.ts";
import { superscript } from "../lib/format.ts";
import {
  type Axis,
  decadeCaption,
  hueAt,
  placeCards,
  readout,
} from "../lib/scale.ts";
import { routes } from "../routes.ts";
import {
  AXIS_X,
  backdropStyle,
  backStyle,
  captionStyle,
  cardLabelStyle,
  cardNameStyle,
  cardStyle,
  detailStyle,
  dotStyle,
  headerStyle,
  leaderStyle,
  modeLinkStyle,
  powerStyle,
  readoutStyle,
  rootStyle,
  titleStyle,
  zoomButtonsStyle,
} from "./explorer-ui.ts";

export interface FisheyeProps {
  axis: Axis;
  /** The scrolling explorer for the same scale, for the mode switch. */
  altHref: string;
  [key: string]: Axis | string;
}

/** Pixels per decade at the focus to start with, as a fraction of the stage height. */
const DEFAULT_SCALE = 1 / 3;
/** The half-stage height the server assumes for the first frame. */
const SSR_HALF = 300;
/** How long a double tap or a button takes to zoom, ms. */
const ZOOM_MS = 260;

export const Fisheye = clientEntry(
  import.meta.url,
  function Fisheye(handle: Handle<FisheyeProps>) {
    const { axis, altHref } = handle.props;
    const { hi, lo, kind, points } = axis;
    const span = hi - lo;

    const decades: number[] = [];
    for (let n = Math.floor(hi); n >= Math.ceil(lo); n--) decades.push(n);

    let root: HTMLElement | null = null;
    let stage: HTMLElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let readoutEl: HTMLElement | null = null;
    let powerEl: HTMLElement | null = null;
    let modeLink: HTMLAnchorElement | null = null;
    const detail: Record<string, HTMLElement | null> = {};
    const cards: (HTMLElement | null)[] = [];
    const leaders: (SVGPathElement | null)[] = [];
    const dots: (HTMLElement | null)[] = [];
    const captions: (HTMLElement | null)[] = [];

    /** Bring a point to the reticle. Set up below, once there is a stage. */
    let focusPoint: (index: number) => void = () => {};
    /** Set while a drag is under way, so the click that ends it does not also count as a tap. */
    let dragged = false;

    // The first frame, server-rendered: positions as percentages of the stage.
    const ssrLens: Lens = {
      focus: axis.start,
      m: lensFor(2 * SSR_HALF * DEFAULT_SCALE, span, SSR_HALF),
      span,
      half: SSR_HALF,
    };
    const ssrTop = (log: number) =>
      `${
        (50 + 50 * bend((ssrLens.focus - log) / span, ssrLens.m)).toFixed(3)
      }%`;

    handle.queueTask(() => {
      if (!root || !stage || !canvas) return;
      const rootEl = root;
      const stageEl = stage;
      const canvasEl = canvas;
      const ctx = canvasEl.getContext("2d");
      const options = { signal: handle.signal } as const;
      const win = globalThis as typeof globalThis & Window;

      // --- geometry -----------------------------------------------------------------------

      const lens: Lens = { focus: axis.start, m: 0, span, half: SSR_HALF };
      /** The reticle, px from the stage top. */
      let mid = SSR_HALF;
      let heights = cards.map((card) => card?.offsetHeight ?? 40);

      function measure(): void {
        const h = stageEl.clientHeight;
        mid = h / 2;
        // A little room at both ends, so the extremes are not drawn on the very edge.
        lens.half = Math.max(h / 2 - 12, 40);
        const ratio = Math.min(win.devicePixelRatio || 1, 3);
        canvasEl.width = Math.round(canvasEl.clientWidth * ratio);
        canvasEl.height = Math.round(h * ratio);
        ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
        heights = cards.map((card) => card?.offsetHeight ?? 40);
      }

      const yOf = (log: number) => mid + project(log, lens);
      const clampFocus = () => {
        lens.focus = Math.min(Math.max(lens.focus, lo), hi);
      };
      const maxM = () => lensFor(lens.half * 24, span, lens.half);
      const setM = (m: number) => {
        lens.m = Math.min(Math.max(m, 0), maxM());
      };

      // --- drawing ------------------------------------------------------------------------

      function drawRuler(): void {
        if (!ctx) return;
        const w = canvasEl.clientWidth;
        ctx.clearRect(0, 0, w, canvasEl.height);
        ctx.strokeStyle = "rgb(255 255 255 / 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w - 1, yOf(hi));
        ctx.lineTo(w - 1, yOf(lo));
        ctx.stroke();

        ctx.lineWidth = 1;
        for (const n of decades) {
          const spacing = localScale(n, lens);
          // A decade squeezed below a few pixels would only draw a grey smear.
          if (spacing < 2.5) continue;
          const y = yOf(n);
          ctx.strokeStyle = `rgb(255 255 255 / ${Math.min(0.6, spacing / 20)})`;
          ctx.beginPath();
          ctx.moveTo(w - 12, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          if (spacing < 50) continue;
          ctx.strokeStyle = "rgb(255 255 255 / 0.45)";
          for (let k = 2; k <= 9; k++) {
            const yk = yOf(n - 1 + Math.log10(k));
            ctx.beginPath();
            ctx.moveTo(w - 6, yk);
            ctx.lineTo(w, yk);
            ctx.stroke();
          }
        }
      }

      /** Captions, nearest the focus first, each at least `GAP` px from those already shown. */
      function placeCaptions(): void {
        const GAP = 30;
        const shown: number[] = [];
        const order = decades
          .map((n, i) => ({ i, y: yOf(n), d: Math.abs(n - lens.focus) }))
          .sort((a, b) => a.d - b.d);
        for (const { i, y } of order) {
          const el = captions[i];
          if (!el) continue;
          const free = shown.every((s) => Math.abs(s - y) >= GAP);
          el.toggleAttribute("hidden", !free);
          if (!free) continue;
          shown.push(y);
          el.style.top = `${y}px`;
        }
      }

      function placePoints(): void {
        const anchors = points.map((p) => yOf(p.log));
        const slots = placeCards(anchors, heights, {
          maxShift: Math.max(20, Math.min(focusScale(lens) * 0.3, 56)),
        });
        slots.forEach((slot, i) => {
          dots[i]?.style.setProperty("top", `${anchors[i]}px`);
          const card = cards[i];
          if (!card) return;
          card.style.top = `${slot.top}px`;
          card.toggleAttribute("data-hidden", !slot.visible);
          const anchor = anchors[i] - slot.top;
          const middle = heights[i] / 2;
          leaders[i]?.setAttribute(
            "d",
            `M -20 ${anchor} C -10 ${anchor} -10 ${middle} 0 ${middle}`,
          );
        });
      }

      let focused = -1;
      function setFocus(index: number): void {
        if (index === focused) return;
        if (focused >= 0) {
          cards[focused]?.removeAttribute("data-focus");
          dots[focused]?.removeAttribute("data-focus");
        }
        focused = index;
        const point = points[index];
        if (point) {
          cards[index]?.setAttribute("data-focus", "");
          dots[index]?.setAttribute("data-focus", "");
        }
        detail.root?.toggleAttribute("data-empty", !point);
        if (detail.label) detail.label.textContent = point?.label ?? "";
        if (detail.name) detail.name.textContent = point?.name ?? "";
        if (detail.nameEn) detail.nameEn.textContent = point?.nameEn ?? "";
        if (detail.description) {
          detail.description.textContent = point?.description ?? "";
        }
      }

      let hashTimer: ReturnType<typeof setTimeout> | undefined;
      function render(): void {
        drawRuler();
        placeCaptions();
        placePoints();

        if (readoutEl) readoutEl.textContent = readout(kind, lens.focus);
        if (powerEl) {
          powerEl.textContent = `10${superscript(lens.focus.toFixed(2))}`;
        }
        rootEl.style.setProperty(
          "--hue",
          String(hueAt((hi - lens.focus) / span)),
        );

        // The entry nearest the reticle, if one is within 60 px of it.
        let best = -1;
        let bestDist = 60;
        points.forEach((p, i) => {
          const d = Math.abs(project(p.log, lens));
          if (d < bestDist) [best, bestDist] = [i, d];
        });
        setFocus(best);

        clearTimeout(hashTimer);
        hashTimer = setTimeout(() => {
          const hash = `#at=${lens.focus.toFixed(2)}&m=${lens.m.toFixed(1)}`;
          if (location.hash !== hash) {
            history.replaceState(history.state, "", hash);
          }
          if (modeLink) {
            modeLink.href = `${altHref}#at=${lens.focus.toFixed(2)}`;
          }
        }, 400);
      }

      let frame = 0;
      function schedule(): void {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          render();
        });
      }

      // --- motion -------------------------------------------------------------------------

      let motion = 0;
      const stop = () => cancelAnimationFrame(motion);

      /** Eases the focus to `log` and the lens to `m`. */
      function glide(log: number, m: number): void {
        stop();
        const [f0, k0] = [lens.focus, Math.log(lens.m + 1)];
        const k1 = Math.log(Math.min(Math.max(m, 0), maxM()) + 1);
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - t0) / ZOOM_MS, 1);
          const e = 1 - (1 - t) ** 3;
          lens.focus = f0 + (log - f0) * e;
          lens.m = Math.exp(k0 + (k1 - k0) * e) - 1;
          clampFocus();
          render();
          if (t < 1) motion = requestAnimationFrame(step);
        };
        motion = requestAnimationFrame(step);
      }

      /** Keeps a flung drag going, slowing down. `v` is px/ms at the focus. */
      function coast(v: number): void {
        stop();
        let last = performance.now();
        const step = (now: number) => {
          const dt = now - last;
          last = now;
          lens.focus += (v * dt) / focusScale(lens);
          v *= 0.95 ** (dt / 16);
          clampFocus();
          render();
          if (Math.abs(v) > 0.02 && lens.focus > lo && lens.focus < hi) {
            motion = requestAnimationFrame(step);
          }
        };
        motion = requestAnimationFrame(step);
      }

      const zoomBy = (factor: number) =>
        glide(lens.focus, (lens.m + 1) * factor - 1);

      focusPoint = (index) => {
        if (dragged) return;
        const point = points[index];
        if (point) glide(point.log, lens.m);
      };

      // --- input --------------------------------------------------------------------------

      // One finger pans, two pinch. Pointer events cover mouse, pen and touch alike; the stage has
      // `touch-action: none`, so the browser never scrolls or zooms underneath us.
      const pointers = new Map<number, { x: number; y: number }>();
      let gesture:
        | { kind: "pan"; y: number; t: number; v: number; moved: number }
        | { kind: "pinch"; dist: number; mid: number; m: number }
        | null = null;
      let lastTap = { time: 0, y: 0 };

      const two = () => {
        const [a, b] = [...pointers.values()];
        return {
          dist: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
          mid: (a.y + b.y) / 2,
        };
      };

      rootEl.addEventListener("pointerdown", (event) => {
        if ((event.target as Element).closest("header, section")) return;
        stop();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) {
          const { dist, mid } = two();
          gesture = { kind: "pinch", dist, mid, m: lens.m };
        } else if (pointers.size === 1) {
          dragged = false;
          gesture = {
            kind: "pan",
            y: event.clientY,
            t: performance.now(),
            v: 0,
            moved: 0,
          };
        }
      }, options);

      rootEl.addEventListener("pointermove", (event) => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (gesture?.kind === "pinch" && pointers.size >= 2) {
          const { dist, mid } = two();
          setM((gesture.m + 1) * (dist / gesture.dist) - 1);
          // The fingers' midpoint pans, like one finger would.
          lens.focus += (mid - gesture.mid) / focusScale(lens);
          gesture.mid = mid;
          clampFocus();
          schedule();
        } else if (gesture?.kind === "pan") {
          const now = performance.now();
          const dy = event.clientY - gesture.y;
          gesture.moved += Math.abs(dy);
          if (gesture.moved > 6) dragged = true;
          // Dragging down pulls larger values toward the reticle.
          lens.focus += dy / focusScale(lens);
          clampFocus();
          const dt = Math.max(now - gesture.t, 1);
          gesture.v = 0.8 * (dy / dt) + 0.2 * gesture.v;
          gesture.y = event.clientY;
          gesture.t = now;
          schedule();
        }
      }, options);

      const release = (event: PointerEvent) => {
        if (!pointers.delete(event.pointerId)) return;
        if (gesture?.kind === "pinch") {
          // Lifting one finger of a pinch must not turn the other into a fling.
          gesture = pointers.size === 0 ? null : {
            kind: "pan",
            y: [...pointers.values()][0].y,
            t: performance.now(),
            v: 0,
            moved: 99,
          };
          dragged = true;
          return;
        }
        if (gesture?.kind !== "pan" || pointers.size > 0) return;
        const now = performance.now();
        const fresh = now - gesture.t < 80;
        if (gesture.moved > 6) {
          if (fresh && Math.abs(gesture.v) > 0.1) coast(gesture.v);
        } else if (
          now - lastTap.time < 320 && Math.abs(event.clientY - lastTap.y) < 40
        ) {
          // Double tap: bring the tapped value to the reticle, and look closer.
          const offset = event.clientY - stageEl.getBoundingClientRect().top -
            mid;
          glide(unproject(offset, lens), (lens.m + 1) * 2 - 1);
          lastTap = { time: 0, y: 0 };
        } else {
          lastTap = { time: now, y: event.clientY };
        }
        gesture = null;
      };
      rootEl.addEventListener("pointerup", release, options);
      rootEl.addEventListener("pointercancel", release, options);

      for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
        rootEl.addEventListener(type, (e) => e.preventDefault(), options);
      }

      win.addEventListener("wheel", (event) => {
        event.preventDefault();
        stop();
        if (event.ctrlKey) {
          setM((lens.m + 1) * Math.exp(-event.deltaY * 0.01) - 1);
        } else {
          lens.focus -= event.deltaY / focusScale(lens);
          clampFocus();
        }
        schedule();
      }, { ...options, passive: false });

      win.addEventListener("keydown", (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const step = 60 / focusScale(lens);
        if (event.key === "+" || event.key === "=") zoomBy(2);
        else if (event.key === "-" || event.key === "_") zoomBy(0.5);
        else if (event.key === "ArrowUp") glide(lens.focus + step, lens.m);
        else if (event.key === "ArrowDown") glide(lens.focus - step, lens.m);
        else return;
        event.preventDefault();
      }, options);

      rootEl.querySelectorAll<HTMLElement>("[data-zoom]").forEach((button) => {
        button.addEventListener("click", () => {
          zoomBy(Number(button.dataset.zoom));
        }, options);
      });

      win.addEventListener("resize", () => {
        measure();
        schedule();
      }, options);

      handle.signal.addEventListener("abort", () => {
        stop();
        cancelAnimationFrame(frame);
        clearTimeout(hashTimer);
      });

      // --- start --------------------------------------------------------------------------

      measure();
      const params = new URLSearchParams(location.hash.slice(1));
      const at = Number(params.get("at"));
      const m = Number(params.get("m"));
      if (params.has("at") && Number.isFinite(at)) lens.focus = at;
      clampFocus();
      setM(
        params.has("m") && Number.isFinite(m)
          ? m
          : lensFor(2 * lens.half * DEFAULT_SCALE, span, lens.half),
      );
      rootEl.setAttribute("data-ready", "");
      render();

      document.fonts?.ready.then(() => {
        if (handle.signal.aborted) return;
        measure();
        schedule();
      });
    });

    return () => (
      <div
        mix={[
          ref((node) => (root = node as HTMLElement)),
          rootStyle,
          fixedStyle,
        ]}
        style={{ "--hue": String(hueAt((hi - axis.start) / span)) }}
      >
        <div mix={backdropStyle} />

        <div mix={[ref((node) => (stage = node as HTMLElement)), stageStyle]}>
          <canvas
            mix={[
              ref((node) => (canvas = node as HTMLCanvasElement)),
              canvasStyle,
            ]}
          />
          {decades.map((n, i) => {
            const caption = decadeCaption(kind, n);
            return (
              <div
                key={`c${n}`}
                mix={[
                  ref((node) => (captions[i] = node as HTMLElement)),
                  captionStyle,
                ]}
                style={{ top: ssrTop(n) }}
              >
                <b>{caption.power}</b>
                <span>{caption.words}</span>
              </div>
            );
          })}
          {points.map((point, i) => (
            <button
              key={`d${i}`}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              mix={[
                ref((node) => (dots[i] = node as HTMLElement)),
                dotStyle,
                on("click", () => focusPoint(i)),
              ]}
              style={{ top: ssrTop(point.log) }}
            />
          ))}
          {points.map((point, i) => (
            <button
              key={`p${i}`}
              type="button"
              mix={[
                ref((node) => (cards[i] = node as HTMLElement)),
                cardStyle,
                on("click", () => focusPoint(i)),
              ]}
              style={{ top: ssrTop(point.log) }}
            >
              <svg mix={leaderStyle} aria-hidden="true">
                <path
                  mix={ref((node) => (leaders[i] = node as SVGPathElement))}
                />
              </svg>
              <span mix={cardLabelStyle}>{point.label}</span>
              <span mix={cardNameStyle}>{point.name}</span>
            </button>
          ))}
          <div mix={reticleStyle} aria-live="polite">
            <output
              mix={[
                ref((node) => (readoutEl = node as HTMLElement)),
                readoutStyle,
              ]}
            >
              {readout(kind, axis.start)}
            </output>
            <small
              mix={[ref((node) => (powerEl = node as HTMLElement)), powerStyle]}
            >
            </small>
          </div>
        </div>

        <header mix={headerStyle}>
          <a href={routes.home.href()} mix={backStyle} aria-label="トップへ">
            ←
          </a>
          <div mix={titleStyle}>
            <h1>{axis.title}</h1>
            <p>{axis.subtitle}</p>
          </div>
          <a
            href={altHref}
            mix={[
              ref((node) => (modeLink = node as HTMLAnchorElement)),
              modeLinkStyle,
            ]}
          >
            通常
          </a>
          <div mix={zoomButtonsStyle}>
            <button type="button" data-zoom="0.5" aria-label="レンズを弱く">
              −
            </button>
            <button type="button" data-zoom="2" aria-label="レンズを強く">
              +
            </button>
          </div>
        </header>

        <section
          mix={[
            ref((node) => (detail.root = node as HTMLElement)),
            detailStyle,
          ]}
          data-empty=""
        >
          <p>
            上下にドラッグで移動・ピンチで拡大縮小・ダブルタップでそこへ寄る。端まで全部が常に画面内
          </p>
          <small mix={ref((node) => (detail.label = node as HTMLElement))} />
          <h2 mix={ref((node) => (detail.name = node as HTMLElement))} />
          <span mix={ref((node) => (detail.nameEn = node as HTMLElement))} />
          <p mix={ref((node) => (detail.description = node as HTMLElement))} />
        </section>
      </div>
    );
  },
);

// --- styles (fisheye only; the shared look is in `explorer-ui.ts`) -------------------------

/** The whole page is one stage: nothing scrolls, every touch is ours. */
const fixedStyle = css({
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  touchAction: "none",
});

/** Between the header and the reading panel; the reticle is its middle. */
const stageStyle = css({
  position: "absolute",
  left: 0,
  right: 0,
  top: "calc(env(safe-area-inset-top, 0px) + 3.6rem)",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
  // A card centred on a point at the very end would otherwise hang under the reading panel.
  overflow: "hidden",
});

const canvasStyle = css({
  position: "absolute",
  top: 0,
  left: `${AXIS_X - 13}px`,
  width: "14px",
  height: "100%",
  pointerEvents: "none",
});

const reticleStyle = css({
  position: "absolute",
  left: 0,
  right: 0,
  top: "50%",
  height: 0,
  borderTop: "1px dashed hsl(calc(var(--hue) + 40) 90% 72%)",
  pointerEvents: "none",
});
