/**
 * The landing page: the two scales, and how to move around them.
 *
 * It ships no JavaScript of its own beyond one inline line — the site used to live at `/#history`
 * and `/#length`, and those links are still out there.
 */

import { css, type Handle, unsafeHTML } from "@remix-run/component";

import { routes } from "../routes.ts";
import { color, radius } from "../tokens.ts";

export const title = "スケール探検 — scale.kbn.one";
export const description =
  "宇宙の歴史と、ものの大きさ。何十桁にもわたるスケールを、スマホで指一本で行き来する。";

export const hydrate = false;

/**
 * The old hash routes, forwarded to the pages that replaced them. The script is a constant; the
 * targets ride in `data-` attributes, so no value is ever spliced into code.
 */
const REDIRECT =
  "(function(d){var m={'#history':d.history,'#length':d.length}" +
  "[location.hash];if(m)location.replace(m)})(document.currentScript.dataset)";

const SCALES = [
  {
    href: routes.history.href(),
    title: "宇宙史のスケール",
    range: "138億年前 → 現在",
    blurb: "ビッグバンから AI まで。1 画面 = 数桁の時間を、上から下へ。",
    from: 10,
    to: 0,
  },
  {
    href: routes.length.href(),
    title: "長さのスケール",
    range: "10⁻³⁵ m → 930億光年",
    blurb: "プランク長から観測可能な宇宙まで、63 桁。",
    from: 27,
    to: -35,
  },
];

export default function Home(_handle: Handle) {
  return () => (
    <>
      <script
        data-history={routes.history.href()}
        data-length={routes.length.href()}
        innerHTML={unsafeHTML(REDIRECT)}
      />
      <h1>スケール探検</h1>
      <p mix={leadStyle}>
        対数のものさしの上を、スクロールで旅する。1 目盛りごとに 10 倍。
      </p>

      <div mix={gridStyle}>
        {SCALES.map((scale) => (
          <a key={scale.href} href={scale.href} mix={cardStyle}>
            <span mix={rangeStyle}>{scale.range}</span>
            <strong>{scale.title}</strong>
            <span>{scale.blurb}</span>
          </a>
        ))}
      </div>

      <h2>操作</h2>
      <ul mix={listStyle}>
        <li>
          <b>上下スワイプ / スクロール</b> — 桁を移動する。慣性もそのまま効く
        </li>
        <li>
          <b>左右にスワイプ（画面のどこでも）</b>{" "}
          —
          拡大縮小。指の下にあるものは動かず、右へで周りが離れていく（拡大）、左へで寄ってくる（縮小）。画面幅いっぱいで
          10 倍
        </li>
        <li>
          <b>ピンチ</b> — 1 桁の高さを変える（指の間を中心に拡大縮小）
        </li>
        <li>
          <b>ダブルタップ＋そのままドラッグ</b>{" "}
          — 片手ズーム。下へで拡大、上へで縮小。ダブルタップだけなら 2 倍
        </li>
        <li>
          <b>右端のバー</b> — 全体のどこにいるかの表示。押してなぞると一気に移動
        </li>
        <li>
          <b>カードをタップ</b> — その出来事を読み取り線に合わせ、上に詳細を出す
        </li>
        <li>
          PC では <kbd>Ctrl</kbd>+ホイール（トラックパッドのピンチ）や{" "}
          <kbd>+</kbd> <kbd>-</kbd> キーでズーム
        </li>
      </ul>
      <p mix={noteStyle}>
        位置と倍率は URL に残るので、そのまま共有できます。
      </p>
    </>
  );
}

const leadStyle = css({ color: color.muted });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
  gap: "1rem",
  marginBlock: "2rem",
});

const cardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  padding: "1.25rem",
  borderRadius: radius.lg,
  border: `1px solid ${color.border}`,
  background: color.card,
  color: color.fg,
  textDecoration: "none",
  transition: "border-color 120ms",
  "& strong": { fontSize: "1.25rem" },
  "& > span:last-child": { color: color.muted, fontSize: "0.9rem" },
  "&:hover": { borderColor: color.accent },
});

const rangeStyle = css({
  fontSize: "0.8rem",
  color: color.accent,
});

const listStyle = css({
  paddingLeft: "1.1rem",
  "& li": { marginBlock: "0.5rem" },
});

const noteStyle = css({ color: color.muted, fontSize: "0.9rem" });
