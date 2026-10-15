/**
 * The explorer: one scale on a log₁₀ axis that the page itself scrolls along.
 *
 * The design bets on the one gesture every phone already does well — a vertical swipe with
 * momentum. The axis is laid out in the document, one decade `decadePx` tall, so the browser's own
 * scrolling (inertia, the scrollbar, the keyboard, the address bar collapsing) moves through orders
 * of magnitude with nothing in between. Everything else is about the other axis, zoom:
 *
 * - **Pinch** (two fingers) changes how tall a decade is, anchored between the fingers.
 * - **Double-tap and drag** (one thumb, the maps gesture): tap, then touch again and drag down to
 *   zoom in, up to zoom out. A plain double tap zooms in ×2.
 * - **Ctrl + wheel / trackpad pinch** on a desktop, and the `−` `+` buttons and keys anywhere.
 * - **The rail** on the right edge is the whole scale end to end. Drag along it to jump — the
 *   index scrubber an address book has — and it shows where the screen is within the whole.
 *
 * The reticle, a line 38% down the screen, is the reading head: its value is printed beside it, and
 * the entry nearest to it fills the panel at the bottom. Tapping a card brings it to the reticle.
 *
 * Positions are CSS: every dot, caption and card sits at `calc(var(--pad-top) + (hi − log) ×
 * var(--decade))`, so the server-rendered page is already a working scrollable scale with no
 * JavaScript, and a zoom is one custom property. Script adds what CSS cannot: card collision
 * (`placeCards`), the readout, the rail, and the gestures. It touches the DOM directly — `render`
 * runs once, and the frame loop never calls `handle.update()`.
 */

import { clientEntry, type Handle, on, ref } from "@remix-run/component";

import {
  anchoredScroll,
  type Axis,
  captionStep,
  clampDecadePx,
  decadeCaption,
  hueAt,
  logToY,
  placeCards,
  readout,
  yToLog,
} from "../lib/scale.ts";
import { powerOfTen, superscript } from "../lib/format.ts";
import { routes } from "../routes.ts";
import {
  backdropStyle,
  backStyle,
  captionStyle,
  cardLabelStyle,
  cardNameStyle,
  cardStyle,
  contentStyle,
  detailStyle,
  dotStyle,
  headerStyle,
  leaderStyle,
  modeLinkStyle,
  powerStyle,
  railLabelStyle,
  railMarkStyle,
  railStyle,
  readoutStyle,
  RETICLE,
  reticleStyle,
  rootStyle,
  rulerStyle,
  thumbStyle,
  titleStyle,
  zoomButtonsStyle,
} from "./explorer-ui.ts";

export interface ExplorerProps {
  axis: Axis;
  /** The fisheye explorer for the same scale, for the mode switch. */
  altHref: string;
  [key: string]: Axis | string;
}

/** Decades per screen height to start with. */
const DEFAULT_SPAN = 3;
/** How long the `−` `+` buttons and a double tap take to zoom. */
const ZOOM_MS = 260;

export const Explorer = clientEntry(
  import.meta.url,
  function Explorer(handle: Handle<ExplorerProps>) {
    const { axis, altHref } = handle.props;
    const { hi, lo, kind, points } = axis;
    const span = hi - lo;

    const decades: number[] = [];
    for (let n = Math.floor(hi); n >= Math.ceil(lo); n--) decades.push(n);
    const railStep = [1, 2, 5, 10, 20].find((s) => span / s <= 14) ?? 50;

    let root: HTMLElement | null = null;
    let content: HTMLElement | null = null;
    let reticle: HTMLElement | null = null;
    let readoutEl: HTMLElement | null = null;
    let powerEl: HTMLElement | null = null;
    let rail: HTMLElement | null = null;
    let thumb: HTMLElement | null = null;
    let railMark: HTMLElement | null = null;
    let ruler: HTMLElement | null = null;
    let modeLink: HTMLAnchorElement | null = null;
    const detail: Record<string, HTMLElement | null> = {};
    const cards: (HTMLElement | null)[] = [];
    const leaders: (SVGPathElement | null)[] = [];
    const dots: (HTMLElement | null)[] = [];
    const captions: (HTMLElement | null)[] = [];

    /** Bring a point to the reticle. Set up below, once there is a window to scroll. */
    let focusPoint: (index: number) => void = () => {};

    handle.queueTask(() => {
      if (!root || !content || !reticle || !rail) return;
      const rootEl = root;
      const contentEl = content;
      const reticleEl = reticle;
      const railEl = rail;
      const options = { signal: handle.signal } as const;
      const win = globalThis as typeof globalThis & Window;

      history.scrollRestoration = "manual";

      // --- geometry -----------------------------------------------------------------------

      let viewH = win.innerHeight;
      let viewW = win.innerWidth;
      let reticleY = viewH * RETICLE;
      let decadePx = viewH / DEFAULT_SPAN;
      let heights = cards.map((card) => card?.offsetHeight ?? 40);

      const y = (log: number) => logToY(log, hi, decadePx, reticleY);
      const logAt = (screenY: number) =>
        yToLog(win.scrollY + screenY, hi, decadePx, reticleY);

      function measure(): void {
        viewH = win.innerHeight;
        viewW = win.innerWidth;
        reticleY = reticleEl.getBoundingClientRect().top;
        contentEl.style.setProperty("--pad-top", `${reticleY}px`);
        contentEl.style.setProperty("--pad-bottom", `${viewH - reticleY}px`);
        heights = cards.map((card) => card?.offsetHeight ?? 40);
      }

      /** Lays the cards out for the current zoom. Cheap enough for every frame of a pinch. */
      function layout(): void {
        contentEl.style.setProperty("--decade", `${decadePx}px`);
        ruler?.toggleAttribute("data-fine", decadePx >= 90);

        const step = captionStep(decadePx);
        decades.forEach((n, i) => {
          captions[i]?.toggleAttribute("hidden", n % step !== 0);
        });

        const anchors = points.map((p) => y(p.log));
        const slots = placeCards(anchors, heights, {
          maxShift: Math.max(24, Math.min(decadePx * 0.35, 64)),
        });
        slots.forEach((slot, i) => {
          const card = cards[i];
          if (!card) return;
          const shift = slot.top - anchors[i];
          card.style.transform = `translateY(${shift}px)`;
          card.toggleAttribute("data-hidden", !slot.visible);
          // The leader runs from the dot on the axis to the middle of the card's left edge, in the
          // card's own coordinates: the anchor is at `-shift`, the card's middle at `h / 2`.
          const mid = heights[i] / 2;
          leaders[i]?.setAttribute(
            "d",
            `M -20 ${-shift} C -10 ${-shift} -10 ${mid} 0 ${mid}`,
          );
        });
      }

      /** Sets the zoom and scrolls so that `log` stays at `screenY`. */
      function zoomTo(px: number, log: number, screenY: number): void {
        decadePx = clampDecadePx(px, span, viewH);
        layout();
        win.scrollTo(0, anchoredScroll(log, screenY, hi, decadePx, reticleY));
        schedule();
      }

      let zoomFrame = 0;
      /** Eases the zoom to `px`, holding whatever is at `screenY` in place. */
      function animateZoom(px: number, screenY = reticleY): void {
        cancelAnimationFrame(zoomFrame);
        const log = logAt(screenY);
        const from = Math.log(decadePx);
        const to = Math.log(clampDecadePx(px, span, viewH));
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - t0) / ZOOM_MS, 1);
          const e = 1 - (1 - t) ** 3;
          zoomTo(Math.exp(from + (to - from) * e), log, screenY);
          if (t < 1) zoomFrame = requestAnimationFrame(step);
        };
        zoomFrame = requestAnimationFrame(step);
      }

      function zoomBy(factor: number, screenY = reticleY): void {
        animateZoom(decadePx * factor, screenY);
      }

      focusPoint = (index) => {
        const point = points[index];
        if (!point) return;
        win.scrollTo({
          top: anchoredScroll(point.log, reticleY, hi, decadePx, reticleY),
          behavior: "smooth",
        });
      };

      // --- what the reticle reads --------------------------------------------------------------

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
      function update(): void {
        const at = logAt(reticleY);
        if (readoutEl) readoutEl.textContent = readout(kind, at);
        if (powerEl) {
          powerEl.textContent = `10${superscript(at.toFixed(2))}`;
        }

        // The entry nearest the reticle, if one is within a quarter of the screen.
        let best = -1;
        let bestDist = viewH * 0.25;
        const lineY = win.scrollY + reticleY;
        points.forEach((p, i) => {
          const d = Math.abs(y(p.log) - lineY);
          if (d < bestDist) [best, bestDist] = [i, d];
        });
        setFocus(best);

        rootEl.style.setProperty("--hue", String(hueAt((hi - at) / span)));

        // The rail: the visible window, and the reticle within it.
        const top = (hi - logAt(0)) / span;
        const bottom = (hi - logAt(viewH)) / span;
        if (thumb) {
          thumb.style.top = `${Math.max(top, 0) * 100}%`;
          thumb.style.height = `${
            Math.max(Math.min(bottom, 1) - Math.max(top, 0), 0) * 100
          }%`;
        }
        if (railMark) {
          railMark.style.top = `${((hi - at) / span) * 100}%`;
        }

        clearTimeout(hashTimer);
        hashTimer = setTimeout(() => {
          const hash = `#at=${at.toFixed(2)}&z=${
            (viewH / decadePx).toFixed(2)
          }`;
          if (location.hash !== hash) {
            history.replaceState(history.state, "", hash);
          }
          if (modeLink) modeLink.href = `${altHref}#at=${at.toFixed(2)}`;
        }, 400);
      }

      let frame = 0;
      function schedule(): void {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
      }
      handle.signal.addEventListener("abort", () => {
        cancelAnimationFrame(frame);
        cancelAnimationFrame(zoomFrame);
        clearTimeout(hashTimer);
      });

      win.addEventListener("scroll", schedule, { ...options, passive: true });
      win.addEventListener("resize", () => {
        // The address bar sliding in and out resizes the window by a few dozen pixels on every
        // change of scroll direction. Re-anchoring for that would make the page twitch.
        const keep = logAt(reticleY);
        if (
          win.innerWidth === viewW && Math.abs(win.innerHeight - viewH) < 140
        ) {
          return;
        }
        measure();
        zoomTo(decadePx, keep, reticleY);
      }, options);

      // --- gestures ----------------------------------------------------------------------------

      // Pinch, and double-tap-and-drag. Both are one-touch-sequence modes that own the touch from
      // the moment they start, which is what `preventDefault` on `touchmove` does — and why the
      // listeners are not passive. A single finger otherwise scrolls the page as usual.
      type Gesture =
        | { kind: "pinch"; dist: number; px: number; log: number }
        | {
          kind: "drag";
          startY: number;
          px: number;
          log: number;
          moved: boolean;
        }
        | null;
      let gesture: Gesture = null;
      let lastTap = { time: 0, x: 0, y: 0 };
      let touchStart = { time: 0, x: 0, y: 0 };

      const midpoint = (t: TouchList) => (t[0].clientY + t[1].clientY) / 2;
      const distance = (t: TouchList) =>
        Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

      contentEl.addEventListener("touchstart", (event) => {
        const t = event.touches;
        if (t.length === 2) {
          cancelAnimationFrame(zoomFrame);
          gesture = {
            kind: "pinch",
            dist: Math.max(distance(t), 1),
            px: decadePx,
            log: logAt(midpoint(t)),
          };
          event.preventDefault();
          return;
        }
        if (t.length !== 1) return;
        const now = performance.now();
        const { clientX: x, clientY: cy } = t[0];
        touchStart = { time: now, x, y: cy };
        if (
          now - lastTap.time < 320 &&
          Math.hypot(x - lastTap.x, cy - lastTap.y) < 40
        ) {
          cancelAnimationFrame(zoomFrame);
          gesture = {
            kind: "drag",
            startY: cy,
            px: decadePx,
            log: logAt(cy),
            moved: false,
          };
          event.preventDefault();
        }
      }, { ...options, passive: false });

      contentEl.addEventListener("touchmove", (event) => {
        if (!gesture) return;
        if (event.cancelable) event.preventDefault();
        const t = event.touches;
        if (gesture.kind === "pinch" && t.length >= 2) {
          // The value under the fingers follows the fingers, so a pinch can pan as well.
          zoomTo(
            gesture.px * distance(t) / gesture.dist,
            gesture.log,
            midpoint(t),
          );
        } else if (gesture.kind === "drag" && t.length === 1) {
          const dy = t[0].clientY - gesture.startY;
          if (Math.abs(dy) > 6) gesture.moved = true;
          zoomTo(gesture.px * Math.exp(dy / 120), gesture.log, gesture.startY);
        }
      }, { ...options, passive: false });

      const endTouch = (event: TouchEvent) => {
        const now = performance.now();
        if (gesture?.kind === "drag" && event.touches.length === 0) {
          // A second tap that never moved is a double tap.
          if (!gesture.moved) zoomBy(2, gesture.startY);
          gesture = null;
          lastTap = { time: 0, x: 0, y: 0 };
          return;
        }
        if (gesture?.kind === "pinch") {
          if (event.touches.length < 2) gesture = null;
          lastTap = { time: 0, x: 0, y: 0 };
          return;
        }
        const touch = event.changedTouches[0];
        const tap = touch && now - touchStart.time < 250 &&
          Math.hypot(
              touch.clientX - touchStart.x,
              touch.clientY - touchStart.y,
            ) <
            10;
        lastTap = tap
          ? { time: now, x: touch.clientX, y: touch.clientY }
          : { time: 0, x: 0, y: 0 };
      };
      contentEl.addEventListener("touchend", endTouch, options);
      contentEl.addEventListener("touchcancel", () => {
        gesture = null;
      }, options);

      // iOS ignores `touch-action` for its own pinch-zoom on some versions; refuse it outright.
      for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
        rootEl.addEventListener(type, (e) => e.preventDefault(), options);
      }

      // A trackpad pinch arrives as a wheel event with `ctrlKey` set, and so does Ctrl + wheel.
      win.addEventListener("wheel", (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        cancelAnimationFrame(zoomFrame);
        const factor = Math.exp(-event.deltaY * 0.01);
        zoomTo(decadePx * factor, logAt(event.clientY), event.clientY);
      }, { ...options, passive: false });

      win.addEventListener("keydown", (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === "+" || event.key === "=") zoomBy(2);
        else if (event.key === "-" || event.key === "_") zoomBy(0.5);
      }, options);

      rootEl.querySelectorAll<HTMLElement>("[data-zoom]").forEach((button) => {
        button.addEventListener("click", () => {
          zoomBy(Number(button.dataset.zoom));
        }, options);
      });

      // The rail: press anywhere on it and drag to scrub through the whole scale.
      const scrub = (event: PointerEvent) => {
        const rect = railEl.getBoundingClientRect();
        const f = Math.min(
          Math.max((event.clientY - rect.top) / rect.height, 0),
          1,
        );
        win.scrollTo(
          0,
          anchoredScroll(hi - f * span, reticleY, hi, decadePx, reticleY),
        );
      };
      railEl.addEventListener("pointerdown", (event) => {
        railEl.setPointerCapture(event.pointerId);
        railEl.setAttribute("data-active", "");
        scrub(event);
      }, options);
      railEl.addEventListener("pointermove", (event) => {
        if (railEl.hasPointerCapture(event.pointerId)) scrub(event);
      }, options);
      const release = () => railEl.removeAttribute("data-active");
      railEl.addEventListener("pointerup", release, options);
      railEl.addEventListener("pointercancel", release, options);

      // --- start -------------------------------------------------------------------------------

      measure();
      const params = new URLSearchParams(location.hash.slice(1));
      const at = Number(params.get("at"));
      const z = Number(params.get("z"));
      const start = params.has("at") && Number.isFinite(at)
        ? Math.min(Math.max(at, lo), hi)
        : axis.start;
      zoomTo(
        params.has("z") && z > 0 ? viewH / z : viewH / DEFAULT_SPAN,
        start,
        reticleY,
      );
      rootEl.setAttribute("data-ready", "");
      update();

      // Card heights depend on the web font; lay out again once it has arrived.
      document.fonts?.ready.then(() => {
        if (handle.signal.aborted) return;
        const keep = logAt(reticleY);
        measure();
        zoomTo(decadePx, keep, reticleY);
      });
    });

    const pos = (log: number) =>
      `calc(var(--pad-top) + ${(hi - log).toFixed(4)} * var(--decade))`;

    return () => (
      <div
        mix={[ref((node) => (root = node as HTMLElement)), rootStyle]}
        style={{ "--hue": String(hueAt(0)) }}
      >
        <div mix={backdropStyle} />

        <div
          mix={[ref((node) => (content = node as HTMLElement)), contentStyle]}
          style={{
            "--decade": `${(100 / DEFAULT_SPAN).toFixed(2)}lvh`,
            height: `calc(var(--pad-top) + ${
              span.toFixed(4)
            } * var(--decade) + var(--pad-bottom))`,
          }}
        >
          <div
            mix={[ref((node) => (ruler = node as HTMLElement)), rulerStyle]}
            style={{
              top: pos(hi),
              height: `calc(${span.toFixed(4)} * var(--decade))`,
              backgroundPositionY: `calc(${
                (hi - Math.floor(hi)).toFixed(4)
              } * var(--decade))`,
            }}
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
                style={{ top: pos(n) }}
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
              style={{ top: pos(point.log) }}
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
              style={{ top: pos(point.log) }}
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
            魚眼
          </a>
          <div mix={zoomButtonsStyle}>
            <button type="button" data-zoom="0.5" aria-label="ズームアウト">
              −
            </button>
            <button type="button" data-zoom="2" aria-label="ズームイン">
              +
            </button>
          </div>
        </header>

        <div
          mix={[ref((node) => (reticle = node as HTMLElement)), reticleStyle]}
          aria-live="polite"
        >
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

        <div
          mix={[ref((node) => (rail = node as HTMLElement)), railStyle]}
          aria-label="全体のスケール。ドラッグで移動"
        >
          {decades.filter((n) => n % railStep === 0).map((n) => (
            <span
              key={`r${n}`}
              mix={railLabelStyle}
              style={{ top: `${((hi - n) / span * 100).toFixed(3)}%` }}
            >
              {powerOfTen(n)}
            </span>
          ))}
          <i mix={[ref((node) => (thumb = node as HTMLElement)), thumbStyle]} />
          <i
            mix={[
              ref((node) => (railMark = node as HTMLElement)),
              railMarkStyle,
            ]}
          />
        </div>

        <section
          mix={[
            ref((node) => (detail.root = node as HTMLElement)),
            detailStyle,
          ]}
          data-empty=""
        >
          <p>
            上下にスワイプで移動・ピンチかダブルタップ＋ドラッグで拡大縮小・右端のバーで一気に移動
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
