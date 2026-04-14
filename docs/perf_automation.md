# Performance Automation

This project includes lightweight performance/refactor checks that can run without extra dependencies beyond the existing Node toolchain.

## Current baseline (2026-02-25)

From `frontend/` after `npm run build` and `npm run perf:report`:

- Entry JS: `~22.8 KiB`
- Initial JS total (index + modulepreload): `~233.2 KiB`

Performance regression checks should compare against this baseline unless a newer baseline refresh is explicitly recorded.

## Local commands

Run from `frontend/`:

```bash
npm run lint
npm run check:duplicates
npm run typecheck
npm run check:imports
npm run test -- --run
npm run perf:report
```

Combined:

```bash
npm run verify:refactor
npm run verify:pr
```

Baseline refresh procedure:

```bash
npm ci
npm run lint
npm run check:duplicates
npm run typecheck
npm run check:imports
npm run build
npm run perf:gate:hard
```

If `git` reports dubious ownership on Windows:

```bash
git config --global --add safe.directory "D:/twbeatles-repos/retirement-sim-web"
```

If `npm ci` fails with `EPERM` on Windows, close file indexers/editors or restart shell, then rerun.

PR-level gate (warn-only, expects a fresh build output):

```bash
npm run verify:pr
```

CI-level strict gate (hard fail, expects a fresh build output):

```bash
npm run verify:ci
```

## What each check validates

- `check:duplicates`
  - Blocks duplicate-style filenames (for example `Component (1).tsx`, `types(1).ts`).
  - Checks `frontend/src`, `frontend/public`, frontend root config files, and repository root files.
- `typecheck`
  - Runs TypeScript no-emit validation.
- `lint`
  - Runs ESLint against `src`, `scripts`, and `vite.config.ts`.
  - Keeps hook rules, equality checks, and common TS hygiene checks visible in CI.
- `check:imports`
  - Blocks direct `logic/engine` usage inside `src/components`.
  - Blocks direct `new Worker(...)` usage inside `src/components`.
  - Blocks direct high-cost `requestSimulation` / `requestSimulationBatch` calls in components except approved files:
    - `src/components/WhatIfSlider.tsx`
    - `src/components/ScenarioComparison.tsx`
  - Blocks legacy `SOLVER_RESULT` event token usage.
  - Blocks duplicate-style filenames inside `src`.
- `perf:report`
  - Reads `dist/index.html` and reports initial JS payload sizes.
  - Reports current entry chunk size against the baseline target.
  - Should be run together with manual interaction checks for:
    - fast input bursts (preview responsiveness),
    - background tab behavior (full simulation skip),
    - lazy-mounted results blocks.
- `perf:gate`
  - Hard fail mode.
  - Fails if any of the following are true:
    - Entry JS exceeds target.
    - Initial JS total exceeds target.
    - No additional lazy-loaded JS chunk is detected (excluding `index-*` and worker chunk).
- `perf:gate:warn`
  - Warn-only mode with the same checks (no non-zero exit).
- `perf:gate:hard`
  - Same checks as `perf:gate` (explicit hard-fail alias).

## Runtime architecture guardrails

- Worker execution lanes:
  - `interactive` lane: preview simulation
  - `compute` lane: full simulation + batch/solver/sensitivity/pension optimization
- Queue policy:
  - `SIMULATION` uses latest-wins coalescing by detail level (`preview` / `full`)
  - each lane keeps `inFlight 1 + queued 1`
  - queued promises fan out to the latest queued request result
- Scheduling policy:
  - input fingerprint dedupe prevents duplicate preview/full runs
  - full run is skipped when `document.visibilityState !== "visible"`
- Rendering policy:
  - heavy results/analysis blocks mount near viewport
  - chart series animations are disabled for initial render cost control

## CI workflow

GitHub Actions workflow: `.github/workflows/frontend-performance-guard.yml`

Runs on frontend changes:

1. `npm ci`
2. `npm run lint`
3. `npm run check:duplicates`
4. `npm run typecheck`
5. `npm run check:imports`
6. `npm run test -- --run`
7. `npm run build`
8. Pull request: `npm run perf:gate:warn`
9. Push to `main`: `npm run perf:gate:hard`

## Latest verification snapshot (2026-04-14)

From `npm run verify:pr`:

- includes `lint`, `typecheck`, `check:duplicates`, `check:imports`, `test`, `build`
- Entry JS: `~49.9 KiB`
- Initial JS total (index + modulepreload): `~260.3 KiB`

No gate failures were reported.
