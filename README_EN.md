# Retirement Sim Web

Retirement planning simulator for Korea-focused scenarios, built with React, TypeScript, and Web Workers.

## Current Contract

- Runtime, worker, storage, and export now use `SimulationPlanV3`.
- `SimulationPlanV2` remains only as an import-migration source.
- The user-facing app, validation copy, and primary export labels are Korean-first.
- Public worker/client APIs are plan-only:
  - `requestSimulation(plan, options)`
  - `requestSimulationBatch(plans, options)`
  - solver and sensitivity APIs also take canonical plans
- The plan-aware engine path applies these V3 fields in calculation:
  - `incomeStreams[].taxable`
  - `incomeStreams[].healthInsuranceIncluded`
  - `accounts[].withdrawalPriority`
- `targetMonthlySpending` and `retirementSpendingTarget` are current-value living-expense targets. Post-retirement monthly runs CPI-index that target, while tax and health-insurance premiums are separate expenses.
- Probabilistic results expose:
  - distribution summaries
  - `display.representative`
  - `display.samples[]`
- `summary.survivalStats` is computed from depletion data regardless of `includeSurvivalSeries`.
- `includeSampleTimelines=false` or `maxSampleTimelines=0` also suppresses `display.samples[]`.
- Exported plan files and IndexedDB storage use `schemaVersion: 3`.
- Older or unavailable local IndexedDB storage surfaces a reset/fallback notice, and JSON import/export remains available.
- Full Monte Carlo runs are capped at `10,000` paths. UI controls, validation, and the engine share the same defensive limit.
- JSON import accepts UTF-8 V2/V3 plan envelopes up to `1MB`.
- Large imported plan collections are blocked at validation time before they can fan out into expensive UI or engine work.
- In latest-wins `requestSimulation()` coalescing, a queued request replaced by a newer queued request rejects with `AbortError`. UI consumers treat this as cancellation, not a user-visible failure.
- Corrupt IndexedDB scenario records are skipped record-by-record when possible, while valid records remain available.

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
      plan-editor/      # V3 plan editor sections
      scenario-manager/ # scenario presets/helpers
      scenario-comparison/
      risk-dashboard/
      what-if/
      income-manager/
      simple-dashboard/ # dashboard display helpers
    hooks/
    logic/
      engine/
        runSimulation.ts
        runConfig.ts
        modePolicy.ts
        distributionStats.ts
        pathReturns.ts
        pathSimulation.ts
        pathReplay.ts
        pathSelection.ts
        summary.ts
      featureTypes.ts    # Phase 1-7 extension types
      types.ts           # public type facade
      plan/              # SimulationPlanV3 schema and converters
      planV2/            # v2 import migration helpers only
      rules/
      validation/        # facade plus V3 shape/enum/runtime policy helpers
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
npm run lint
npm run check:duplicates
npm run typecheck
npm run check:imports
npm run test -- --run
npm run build
npm run verify:ci
```

## Notes

- Some UI state still starts from `SimulationInput`, but worker/client/storage/report boundaries normalize into `SimulationPlanV3`.
- `logic/types.ts` is kept as a compatibility facade; extension domain types live in `logic/featureTypes.ts`.
- Long UI components are split into feature folders while preserving the existing public component imports.
- Imported or edited runtime values such as invalid simulation mode, invalid annual rates, excessive Monte Carlo paths, duplicate IDs, and oversized collections are blocking validation errors.

## Documentation

- [README.md](README.md)
- [CLAUDE.md](CLAUDE.md)
- [GEMINI.md](GEMINI.md)
- [docs/api_examples.md](docs/api_examples.md)
- [docs/modeling_notes.md](docs/modeling_notes.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/perf_automation.md](docs/perf_automation.md)
