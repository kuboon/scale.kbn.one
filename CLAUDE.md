# CLAUDE.md — scale.kbn.one

## Project Overview

Interactive logarithmic scale explorer ("スケール探検") that lets users scroll/swipe through vastly different orders of magnitude. Two scales available:

- **History** (`#history`): Big Bang → present (1.38×10¹⁰ years → now)
- **Length** (`#length`): Planck length (10⁻³⁵ m) → Observable Universe (8.8×10²⁷ m)

UI is primarily in Japanese with English translations. Licensed under MIT.

## Tech Stack

- **TypeScript** (strict mode, ES2022 target)
- **Vite** via `vite-plus` — build tool
- **Cloudflare Pages/Workers** — deployment (wrangler)
- **No runtime dependencies** — vanilla TS, HTML, CSS only
- **YAML** data files parsed via custom Vite plugin + `js-yaml`

## Commands

```sh
npm run dev       # Local dev server (vite-plus)
npm run build     # Production build → dist/
npm run test      # Run tests (vp test run)
npm run preview   # Build + local preview via wrangler
npm run deploy    # Build + deploy to Cloudflare
```

## Project Structure

```
├── index.html              # Entry HTML
├── vite.config.ts          # Vite config (ES2022, YAML plugin)
├── vite-plugin-yaml.ts     # Custom plugin: import .yaml as ES modules
├── wrangler.jsonc           # Cloudflare Workers config
├── tsconfig.json           # TypeScript strict config
├── mise.toml               # Tool version pinning (node, vite-plus)
├── data/
│   ├── history.yaml        # Timeline entries (45+ items)
│   └── length.yaml         # Length scale entries (35+ items)
└── src/
    ├── main.ts             # Entry point, hash-based routing
    ├── landing.ts          # Landing page with scale selection cards
    ├── explorer.ts         # Main interactive explorer (scroll, touch, animation)
    ├── scroll-engine.ts    # Linear viewport math, zoom clamping, tick generation
    ├── scale-overview.ts   # Left overview bar (whole scale + visible slice) + zoom readout
    ├── format.ts           # Number formatting (Japanese numerals, superscript)
    ├── types.ts            # TypeScript interfaces (ScaleMeta, ScaleEntry, ScaleData)
    ├── style.css           # All styles (CSS variables, responsive, animations)
    └── vite-env.d.ts       # Vite type declarations
```

## Architecture & Key Patterns

**Routing:** Hash-based (`#`, `#history`, `#length`) handled in `main.ts`.

**Functional style:** No classes. Each module exports functions (e.g., `renderExplorer`, `destroyExplorer`). State is managed via closures.

**Viewport model:** Core math in `scroll-engine.ts`, split across two independent axes:

- **Vertical = linear pan.** The viewport is the plain interval `[bottom, bottom + span]`, and `valueToFraction` maps it linearly (0 = top = large values). Vertical scroll/swipe moves `bottom`.
- **Horizontal = logarithmic zoom.** `spanExp` is the log₁₀ of the visible span; a rightward swipe decreases it (zoom in). Zoom is anchored under the pointer (`zoomAnchoredBottom`), so whatever sits beneath the finger stays put while everything else spreads around it.

Both axes apply on every input event — there is no axis lock, so a diagonal swipe zooms and pans at once. Graduations come from `niceStep` (round 1/2/5 × 10ⁿ steps), shared by the vertical gridlines and the bottom ruler.

**Two vertical lines on the left:**

- **Line 1 — `scale-overview.ts`.** A fixed bar covering the whole scale end to end, captioned with both extremes (`約138億年前` … `現在`). The slice line 2 is currently showing is highlighted on it, so you can always see which part of the whole you are in.
- **Line 2 — `.explorer-line`.** The detail axis itself, carrying the cards and the (unlabelled) gridlines.

`overviewFraction` maps the bar **linearly**, matching the detail axis, and clamps at both ends. This matters: a mapping that stretches the low end (log, or any root) stretches motion down there too, so nudging `bottom` off zero by a thousandth of the range would throw the lower edge a third of the way up the bar on a swipe the user can barely feel. Linear is the only mapping where the marker moves in proportion to the gesture. The cost is that deep zooms pin the marker near the foot — accepted, and `MIN_WINDOW_PX` keeps it visible as a position marker once the slice falls below a pixel.

The zoom readout (`10⁺⁷ 年前` + a human-readable gloss) lives in the same module, as a pill at the bottom centre.

**Animation loop:** `requestAnimationFrame` with exponential easing: `current += (target - current) * 0.12`, applied to `spanExp` and `bottom` independently. The loop only writes `transform`/`opacity`/`display` — element creation and text layout stay out of it. Crowded cards are left to overlap on purpose: zooming in is what pulls them apart, so nothing is culled except what falls off-screen.

**Hue theming:** Background hue cycles (270°→30°) across the scale via `--bg-hue` CSS variable.

**Data flow:** YAML → imported as ES modules at build time → passed to explorer as `ScaleData`.

## Code Conventions

- **Variables/functions:** camelCase (`currentExp`, `hueForExponent`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_TICKS`, `CARD_HEIGHT`)
- **CSS classes:** kebab-case (`.scale-card`, `.explorer-viewport`)
- **One module per file**, clear separation of concerns
- **Passive event listeners** used appropriately (passive: false only where preventDefault needed)
- **Cleanup functions** (e.g., `destroyExplorer()`) prevent memory leaks on route changes
- **Commit messages** mix Japanese and English; use conventional-ish prefixes (`fix:`, `feat:`)

## Data Files

Scale entries in `data/*.yaml` follow this structure:

```yaml
meta:
  id: history
  title: 宇宙の歴史
  unit: 年前
  unitSymbol: 年前
  minExponent: -1
  maxExponent: 11
entries:
  - exponent: 10 # log₁₀ value
    value: 1.38 # actual value is (value × 10^exp)
    name: ビッグバン # Japanese name
    nameEn: Big Bang # English name
    description: ... # Japanese description
```

## CI/CD

- **GitHub Actions** (`.github/workflows/test-deploy.yaml`): build on push to `main`, deploy to GitHub Pages
- **Cloudflare** deployment also available via `npm run deploy`
- **Dependabot** configured with 7-day cooldown

## Important Notes

- Tests use `vite-plus/test` (Vitest-compatible API): `npm test`
- Build output goes to `dist/` (gitignored)
- `.npmrc` sets `ignore-scripts=true` and `min-release-age=7d` for security
- The app uses no external runtime JS — everything is bundled vanilla TypeScript
