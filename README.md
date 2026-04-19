# Retirement Sim Web

Retirement planning simulator built with React, TypeScript, Web Workers, and a Korea-focused ruleset.

## Current Contract

- Runtime, worker, storage, and export all use `SimulationPlanV3`.
- `SimulationPlanV2` remains for JSON import migration only.
- Worker/client public APIs are plan-only:
  - `requestSimulation(plan, options)`
  - `requestSimulationBatch(plans, options)`
  - `requestSolveContribution(plan, targetSuccessRate)`
  - `requestSolveLaborSavingsRate(plan, targetSuccessRate)`
  - `requestSolveRetireAge(plan, targetSuccessRate)`
- Preview and full runs share the same canonical plan payload and engine path. They differ only in retained detail.
- Probabilistic results expose:
  - summary distributions
  - `display.representative`
  - `display.samples[]`
- Scenario storage and exported JSON use `schemaVersion: 3`.
- Existing IndexedDB saves are not auto-migrated in place. The app shows a reset notice and supports JSON re-import.

## Rules And Data

- Supported rulebook: `KR-2026.1`
- Historical dataset range: `1985-2024`
- Unsupported rulebook combinations are rejected during validation. There is no silent fallback.

## Key Features

- Deterministic, Monte Carlo, and historical simulations
- Canonical monthly cashflow source tracking for:
  - salary
  - business income
  - rental income
  - national pension
  - private pension
  - additional pension
  - severance
  - reverse mortgage
  - withdrawal principal
  - one-off income / expense
  - debt service
  - trading cost
  - medical shock
  - housing cost
- Korea-oriented tax, pension, and health-insurance calculations
- Representative-path reporting plus labeled sample paths
- Scenario save/load and plan JSON import/export

## Project Layout

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

## Notes

- UI state still starts from `SimulationInput` in several places, but worker/client/storage/report boundaries normalize into `SimulationPlanV3`.
- File names such as `PlanV2Editor.tsx` remain for compatibility, but the component now edits the canonical v3 plan shape.

## Related Docs

- [CLAUDE.md](CLAUDE.md)
- [docs/api_examples.md](docs/api_examples.md)
- [docs/modeling_notes.md](docs/modeling_notes.md)
- [docs/roadmap.md](docs/roadmap.md)
- [docs/retirement_calculator_readiness_review_2026-04-14.md](docs/retirement_calculator_readiness_review_2026-04-14.md)
- [docs/functional_implementation_review_2026-04-19.md](docs/functional_implementation_review_2026-04-19.md)
- [docs/functional_implementation_review_addendum_2026-04-19.md](docs/functional_implementation_review_addendum_2026-04-19.md)
