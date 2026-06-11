# Performance Automation

This project includes lightweight performance and architecture checks that run from the existing Node toolchain.

## Local Commands

Run from `frontend/`:

```bash
npm run lint
npm run check:duplicates
npm run typecheck
npm run check:imports
npm run test -- --run
npm run build
npm run perf:report
```

Combined gates:

```bash
npm run verify:refactor
npm run verify:pr
npm run verify:ci
```

## What The Checks Validate

- `lint`
  - ESLint against `src`, `scripts`, `vite.config.ts`, and `eslint.config.js`
- `check:duplicates`
  - duplicate-style filenames and common accidental copies
- `typecheck`
  - TypeScript no-emit validation
- `check:imports`
  - UI/import boundary guardrails
- `test`
  - unit and integration coverage via Vitest
- `build`
  - production Vite build
- `perf:gate:hard`
  - hard performance threshold enforcement after a fresh build

## Runtime Guardrails

- `interactive` worker lane for preview simulations
- `compute` worker lane for full simulation, batch runs, solver, sensitivity, and pension optimization
- latest-wins coalescing for `SIMULATION`
- replaced queued `SIMULATION` callers reject with `AbortError`; UI code should treat this as cancellation
- representative-path consumers should use shared `resultDisplay` helpers instead of raw sample arrays
- blocking validation errors clear the current result and invalidate stale in-flight simulation responses
- `includeSampleTimelines=false` keeps both legacy sample timelines and `display.samples[]` out of the response payload
- full Monte Carlo requests are capped at `10,000` paths across UI, validation, and engine guard code
- JSON imports are capped at `1MB`, and imported plan collections are capped at `500` items

## Latest Verification Snapshot (2026-06-11)

From `frontend/` after `npm run verify:ci`:

- Entry JS: `67.5 KiB`
- Initial JS total (index plus modulepreload): `277.9 KiB`
- `lint` passed
- `check:duplicates` passed
- `typecheck` passed
- `check:imports` passed
- `test` passed, 16 files / 82 tests
- `build` passed
- `perf:gate:hard` passed
