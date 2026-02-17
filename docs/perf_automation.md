# Performance Automation

This project includes lightweight performance/refactor checks that can run without extra dependencies beyond the existing Node toolchain.

## Local commands

Run from `frontend/`:

```bash
npm run typecheck
npm run check:imports
npm run perf:report
```

Combined:

```bash
npm run verify:refactor
```

PR-level gate (warn-only, expects a fresh build output):

```bash
npm run verify:pr
```

CI-level strict gate (hard fail, expects a fresh build output):

```bash
npm run verify:ci
```

## What each check validates

- `typecheck`
  - Runs TypeScript no-emit validation.
- `check:imports`
  - Blocks direct `logic/engine` usage inside `src/components`.
  - Blocks direct `new Worker(...)` usage inside `src/components`.
  - Blocks legacy `SOLVER_RESULT` event token usage.
- `perf:report`
  - Reads `dist/index.html` and reports initial JS payload sizes.
  - Reports current entry chunk size against the baseline target.
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

## CI workflow

GitHub Actions workflow: `.github/workflows/frontend-performance-guard.yml`

Runs on frontend changes:

1. `npm ci`
2. `npm run typecheck`
3. `npm run check:imports`
4. `npm run build`
5. Pull request: `npm run perf:gate:warn`
6. Push to `main`: `npm run perf:gate:hard`
