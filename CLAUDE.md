# CLAUDE.md

Developer guide for the current codebase contract.

## Architecture

```text
frontend/src/
  components/            # React UI
  hooks/                 # UI orchestration hooks
  logic/
    engine/              # simulation helpers and summary assembly
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

## Storage Rules

- IndexedDB stores `schemaVersion: 3` plus `SimulationPlanV3`.
- Older local stores are reset on version cut.
- The UI must surface a reset/re-import notice when that happens.

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
