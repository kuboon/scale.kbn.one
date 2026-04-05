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
npm run preview   # Build + local preview via wrangler
npm run deploy    # Build + deploy to Cloudflare
```

No test runner is configured. There are no automated tests.

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
    ├── scroll-engine.ts    # Logarithmic viewport math, tick generation
    ├── scale-card.ts       # Card component for individual scale entries
    ├── scale-indicator.ts  # Bottom HUD showing current 10^n position
    ├── format.ts           # Number formatting (Japanese numerals, superscript)
    ├── types.ts            # TypeScript interfaces (ScaleMeta, ScaleEntry, ScaleData)
    ├── style.css           # All styles (CSS variables, responsive, animations)
    └── vite-env.d.ts       # Vite type declarations
```

## Architecture & Key Patterns

**Routing:** Hash-based (`#`, `#history`, `#length`) handled in `main.ts`.

**Functional style:** No classes. Each module exports functions (e.g., `renderExplorer`, `destroyExplorer`). State is managed via closures.

**Logarithmic viewport:** Core math in `scroll-engine.ts` — converts linear scroll input to logarithmic exponent positions. Tick marks use "nice number" algorithm (1, 2, 5 multipliers).

**Animation loop:** `requestAnimationFrame` with exponential easing: `current += (target - current) * 0.12`.

**Dynamic stacking:** Cards avoid overlap via `prevBottomY` tracking rather than fixed grid.

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
  pixelsPerExponent: 300
entries:
  - exponent: 10.14    # log₁₀ value
    value: 1.38e10      # actual value (coefficient × 10^exp)
    name: ビッグバン     # Japanese name
    nameEn: Big Bang     # English name
    description: ...     # Japanese description
```

## CI/CD

- **GitHub Actions** (`.github/workflows/test-deploy.yaml`): build on push to `main`, deploy to GitHub Pages
- **Cloudflare** deployment also available via `npm run deploy`
- **Dependabot** configured with 7-day cooldown

## Important Notes

- No test suite exists — manual testing only
- Build output goes to `dist/` (gitignored)
- `.npmrc` sets `ignore-scripts=true` and `min-release-age=7d` for security
- The app uses no external runtime JS — everything is bundled vanilla TypeScript
