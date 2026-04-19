# Retirement Sim Web

Retirement planning simulator for Korea-focused scenarios, built with React, TypeScript, and Web Workers.

## Current Contract

- Runtime, worker, storage, and export now use `SimulationPlanV3`.
- `SimulationPlanV2` remains only as an import-migration source.
- Public worker/client APIs are plan-only:
  - `requestSimulation(plan, options)`
  - `requestSimulationBatch(plans, options)`
  - solver and sensitivity APIs also take canonical plans
- Probabilistic results expose:
  - distribution summaries
  - `display.representative`
  - `display.samples[]`
- Exported plan files and IndexedDB storage use `schemaVersion: 3`.
- Older local IndexedDB data is reset on schema cut and the UI shows a re-import notice.

## Supported Data And Rules

- Supported rulebook: `KR-2026.1`
- Historical dataset range: `1985-2024`
- Unsupported rulebook combinations are rejected during validation.

## Main Features

- Deterministic, Monte Carlo, and historical simulation modes
- Canonical monthly cashflow source tracking
- Korea-oriented tax, pension, and health-insurance calculations
- Representative-path reporting plus labeled sample paths
- Scenario save/load and plan JSON import/export
- Goal planning and reverse-calculation tools

## Repository Layout

```text
frontend/
  src/
    components/
    hooks/
    logic/
      engine/
      plan/              # SimulationPlanV3 schema and converters
      planV2/            # v2 import migration helpers only
      rules/
      validation/
      simulation.worker.ts
      simulationClient.ts
      resultDisplay.ts
      export.ts
    services/
      storage.ts
```

## Development

```bash
cd frontend
npm install
npm run dev
```

## Verification

```bash
cd frontend
npm run typecheck
npm run test -- --run
npm run build
npm run verify:ci
```

## Documentation

- [README.md](README.md)
- [CLAUDE.md](CLAUDE.md)
- [GEMINI.md](GEMINI.md)
- [docs/api_examples.md](docs/api_examples.md)
- [docs/modeling_notes.md](docs/modeling_notes.md)
- [docs/roadmap.md](docs/roadmap.md)
- [docs/retirement_calculator_readiness_review_2026-04-14.md](docs/retirement_calculator_readiness_review_2026-04-14.md)
- [docs/functional_implementation_review_2026-04-19.md](docs/functional_implementation_review_2026-04-19.md)
- [docs/functional_implementation_review_addendum_2026-04-19.md](docs/functional_implementation_review_addendum_2026-04-19.md)
