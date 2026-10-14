# スケール探検 — scale.kbn.one

何十桁にもわたるスケールを、スマホで指一本で行き来する対数のものさし。

- [宇宙史のスケール](https://scale.kbn.one/history) — ビッグバンから現在まで
- [長さのスケール](https://scale.kbn.one/length) —
  プランク長から観測可能な宇宙まで

Remix v3 + Deno で書き、[@remix-kbn/ssg](https://jsr.io/@remix-kbn/ssg)
で静的化して GitHub Pages
に置いている（[deno-remix-tmpl](https://github.com/kuboon/deno-remix-tmpl) の
static モードがベース）。

```sh
deno task dev           # http://localhost:8000
deno task check         # 型チェック + lint + fmt
deno task test          # ユニット + ルーター
deno task test:browser  # lightpanda で hydration の smoke テスト
deno task build         # web/dist に静的サイト
```

データは `data/*.yaml`。MIT License.
