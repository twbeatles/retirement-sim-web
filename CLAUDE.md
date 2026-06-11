# CLAUDE.md

Developer guide for the current codebase contract.

## Architecture

```text
frontend/src/
  components/            # React UI
    plan-editor/         # SimulationPlanV3 editor sections
    scenario-manager/    # scenario preset/helper modules
    scenario-comparison/ # comparison chart/table helpers
    risk-dashboard/      # risk-analysis tab panels
    what-if/             # what-if slider config/helpers
    income-manager/      # labor-income parsing/chart helpers
    simple-dashboard/    # compact dashboard display helpers
  hooks/                 # UI orchestration hooks
  logic/
    engine/              # run config, mode guards, path returns, distribution stats, path replay/selection
    featureTypes.ts      # Phase 1-7 extension types
    types.ts             # public type facade for existing imports
    plan/                # SimulationPlanV3 schema/converters
    planV2/              # import-only compatibility helpers
    rules/               # rulebook resolution
    validation/          # canonical validation facade plus V3 shape/enum/runtime-policy helpers
    simulation.worker.ts # worker entrypoint
    simulationClient.ts  # worker client queueing/coalescing
    resultDisplay.ts     # representative/sample path helpers
    export.ts            # CSV/report shaping
  services/
    storage.ts           # IndexedDB scenario storage
```

## Source Of Truth

- Canonical runtime/storage/export type: `SimulationPlanV3`
- Canonical result display contract: `result.display.representative` and `result.display.samples[]`
- `SimulationPlanV2` is import migration input only
- `SimulationInput` is still used by parts of the UI, but runtime boundaries normalize into `SimulationPlanV3`
- Keep `logic/types.ts`, `ScenarioManager`, `ScenarioComparison`, `RiskDashboard`, `WhatIfSlider`, `runSimulation(...)`, and `simulateOnePath(...)` as compatibility facades unless a coordinated import migration is planned.
- Put new feature-specific UI helpers under the matching feature folder instead of growing top-level component files.
- User-facing UI copy is Korean-first; keep README_EN and developer-only docs in English where helpful.

## Plan-Aware Calculation Rules

- `incomeStreams[].taxable` controls whether that income source contributes to detailed taxable income.
- `incomeStreams[].healthInsuranceIncluded` controls detailed health-insurance assessable income.
- Liquid account drawdown follows `accounts[].withdrawalPriority` for supported cash, taxable-investment, and private-pension account groups.
- Debt and owner-occupied housing accounts are not withdrawal sources.
- `targetMonthlySpending` and `retirementSpendingTarget` are current-value living-expense targets. The engine CPI-indexes them in monthly retirement cashflow and treats tax and health insurance as separate expenses.

## Worker API

Only these kinds are part of the active contract:

- `SIMULATION`
- `SIMULATION_BATCH`
- `SOLVE_CONTRIBUTION`
- `SOLVE_LABOR_SAVINGS_RATE`
- `SOLVE_RETIRE_AGE`
- `SENSITIVITY_ANALYSIS`
- `PENSION_OPTIMIZATION`

Do not introduce new public `PLAN_SIMULATION*` kinds.

`requestSimulation(...)` uses latest-wins coalescing for queued preview/full
requests. When a queued payload is replaced by a newer payload, the replaced
callers are rejected with `AbortError`; UI code should treat that as cancellation
and avoid surfacing it as a user-visible failure.

## Runtime Limits

- Full Monte Carlo runs are capped at `MAX_FULL_MONTE_CARLO_PATHS = 10_000`.
- Imported JSON files are capped at `MAX_PLAN_IMPORT_BYTES = 1MB`.
- Large imported plan collections are capped at `MAX_PLAN_COLLECTION_ITEMS = 500`.
- Keep UI controls, validators, and engine defenses tied to these shared constants.

## Validation Rules

- Validate the resolved rulebook, not just metadata fields.
- Validate canonical plan buckets and income streams through `validateSimulationPlan(...)`.
- Unsupported rulebooks must fail validation instead of silently falling back.
- Keep shared runtime limits and simulation mode policy in `validation/runtimePolicy.ts`; keep V3 shape and enum checks in their dedicated helper modules.

## Result Consumption Rules

- Prefer `resultDisplay.ts` helpers over reading raw path arrays directly.
- Default reports, charts, CSV, and comparisons to the representative path.
- Show labeled sample paths as explicitly separate data.
- `summary.survivalStats` must remain correct even when `includeSurvivalSeries` is false.
- `includeSampleTimelines=false` and `maxSampleTimelines=0` must leave `display.samples[]` empty.

## Storage Rules

- IndexedDB stores `schemaVersion: 3` plus `SimulationPlanV3`.
- Older local stores are reset on version cut.
- The UI must surface reset, load-failure, and JSON import/export fallback guidance.
- JSON import accepts UTF-8 V2/V3 plan envelopes only and must separate parse,
  schema, validation, read error, and abort messages for users.
- LocalStorage reset notices are best-effort only; failures must not abort an
  IndexedDB upgrade.
- IndexedDB blocked/versionchange paths should close stale handles or surface a
  retryable storage message.
- Corrupt scenario records should be skipped record-by-record when possible, with
  a user-visible count.

## Testing And Verification

```bash
cd frontend
npm run typecheck
npm run test -- --run
npm run build
npm run verify:ci
```

## Compatibility Notes

- `planV2/` and `migration.ts` remain because imported JSON may still arrive in older shapes.
- Legacy-named files may remain in place, but new behavior should target canonical v3 contracts.
