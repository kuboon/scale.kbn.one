# CLAUDE.md — scale.kbn.one

対数スケールの探検アプリ（「スケール探検」）。2 ページ:

- `/history` — `data/history.yaml`。ビッグバン（1.38×10¹⁰ 年前）→ 現在
- `/length` — `data/length.yaml`。プランク長（10⁻³⁵ m）→ 観測可能な宇宙

UI は日本語。MIT。

## 構成

[kuboon/deno-remix-tmpl](https://github.com/kuboon/deno-remix-tmpl) の **static
モード**から作った派生アプリ（server API なし、GitHub Pages のみ）。

```
data/*.yaml                 # スケールのデータ（手で編集する。fmt 対象外）
web/client/                 # ブラウザへ渡るもの全部。deno.ns 無しで型チェック
  routes.ts                 # / /history /length
  layout.tsx                # 文書シェル（bare = ヘッダ無しの全画面ページ）
  pages/index.tsx           # トップ。JS 無し（旧 /#history 等のリダイレクト 1 行だけ）
  pages/explorer.tsx        # Axis → PageModule。2 ページはこれ 1 つ
  islands/explorer.tsx      # 本体の island
  lib/scale.ts              # YAML → Axis、座標、カード配置（純関数）
  lib/format.ts             # 億・万、光年/km/m… の表記
web/server/
  router.tsx                # 唯一のエントリ。ssg がこれをクロールして静的化
  data.ts                   # YAML 読み込み + 検証（@std/yaml）
  og/                       # OGP 画像（canvaskit）
  tests/                    # Deno.test（client/lib のテストもここ）
web/tests/                  # lightpanda のブラウザ smoke テスト
```

## Explorer の設計

- **縦スクロール = 対数軸**。1 桁 =
  `decadePx`。ページそのもの（window）がスクロール
  するので慣性・アドレスバー収縮・キーボードはブラウザ任せ。
- **ズーム = `--decade` の CSS 変数 1 つ**。点・目盛り・カードは
  `calc(var(--pad-top) + (hi − log) × var(--decade))` で置かれるので、SSR の
  HTML だけで JS 無しでも読める。ズーム時は `anchoredScroll`
  で指の下の値を固定する。
- ジェスチャ: **左右スワイプ（画面のどこでも）= ズーム**。触れた点の値を指の下に
  固定したまま、右で拡大・左で縮小、画面幅で ×10（`swipeFactor`）。最初の数 px
  で
  横か縦かを決め（`swipeAxis`）、縦ならブラウザのスクロールに任せる。はじくと慣性。
  ほかにピンチ / ダブルタップ＋ドラッグ / ダブルタップ×2 /
  トラックパッドの横スワイプ・ Ctrl+ホイール / `+` `-` キー /
  右端のレール（全体表示 + スクラブ）。
- 説明は上、操作は下。読み取り線（画面 60%）に一番近い項目がヘッダ直下の
  パネルに出る。カードをタップでそこへ。
- カードは `placeCards` で重ならないよう押し下げ、`maxShift` を超えるものは隠す
  （点だけ残る）。ズームインで増える。
- 位置と倍率は `#at=<log>&z=<画面あたりの桁数>` で URL に残る。
- island は `render` を 1 回だけ走らせ、以後は ref で DOM を直接触る
  （`handle.update()` は呼ばない）。
- 背景色相は読み取り位置で 270°→30°（`hueAt`）。

## コマンド

```sh
deno task dev | check | test | test:browser | build
```

変更前後に `deno task check && deno task test && deno task build` と
`deno task test:browser` を通す。

## データ

```yaml
meta: { id, title, subtitle, unit, unitSymbol, minExponent, maxExponent }
entries:
  - exponent: 9 # value × 10^exponent
    value: 4.5
    name: …
    nameEn: …
    description: …
  - ad: 1868 # 西暦。ビルド年からの「年前」に変換
    name: …
```

`value: 0` は「現在」で軸の下端に固定（log 0 は −∞ のため）。

## 規約

- Deno ファースト、TypeScript strict、`Deno.test()` + `@std/assert`
- 見た目は `css()` mixin と `web/client/tokens.ts`（Tailwind 等は使わない）
- `web/client/` で `Deno.` を参照しない
- コミットメッセージは日英混在、`feat:` `fix:` 等
- デプロイ: `.github/workflows/pages.yml`（main はルート、PR はプレビュー）
