# CLAUDE.md

Developer guide for the current codebase contract.

## Architecture

```text
frontend/src/
  components/            # React UI
    plan-editor/         # SimulationPlanV3 editor sections
    scenario-manager/    # scenario preset/helper modules
    simple-dashboard/    # compact dashboard display helpers
  hooks/                 # UI orchestration hooks
  logic/
    engine/              # simulation path, replay, selection, and summary assembly
    plan/                # SimulationPlanV3 schema/converters
    planV2/              # import-only compatibility helpers
    rules/               # rulebook resolution
    validation/          # canonical validation helpers
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

## Validation Rules

- Validate the resolved rulebook, not just metadata fields.
- Validate canonical plan buckets and income streams through `validateSimulationPlan(...)`.
- Unsupported rulebooks must fail validation instead of silently falling back.

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
