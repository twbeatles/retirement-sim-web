# GEMINI.md

Domain guide for the retirement simulator.

## Product Intent

The product aims to model retirement cashflow durability for Korean households through simulation, reporting, and scenario comparison. The core product trust factors are:

- rulebook transparency
- plan/input consistency
- explainable cashflow outputs
- stable result labeling

## Canonical Runtime Contract

- Canonical plan: `SimulationPlanV3`
- Canonical rule selection: resolved `plan.rulebook`
- Canonical result display:
  - `display.representative`
  - `display.samples[]`

Compatibility layers still exist for legacy inputs and `SimulationPlanV2` imports, but those are not the active runtime contract.

## Engine Model

The engine still uses monthly portfolio projection with stochastic and historical variants. Core modeling areas:

- asset return generation
- retirement spending / withdrawal strategy
- pension cashflows
- tax and health-insurance estimation
- one-off expense and medical-shock handling
- historical-path replay

## Plan-Aware V3 Fields

These `SimulationPlanV3` fields are part of the active calculation path, not metadata-only fields:

- `incomeStreams[].taxable`
- `incomeStreams[].healthInsuranceIncluded`
- `accounts[].withdrawalPriority`

Liquid withdrawal ordering supports cash, taxable investment, and private-pension account groups. Debt and owner-occupied housing accounts are excluded from withdrawal sources.

## Canonical Cashflow Sources

The monthly source map should be treated as the primary decomposition for taxation, reporting, and ledger display:

- salary
- business income
- rental income
- national pension
- private pension
- additional pension
- severance
- reverse mortgage
- interest/dividend
- realized capital gain
- withdrawal principal
- one-off income
- one-off expense
- debt service
- trading cost
- medical shock
- housing cost

## Result Semantics

- `summary.retirementPoint` describes retirement-date assets
- `summary.finalTotalAssets` and terminal distribution stats describe end-of-horizon assets
- `summary.survivalStats` is calculated from depletion data even when `survivalSeries` is omitted
- representative-path consumers should default to `result.display.representative`
- sample paths should be shown as explicitly secondary scenarios, and `includeSampleTimelines=false` or `maxSampleTimelines=0` should keep `display.samples[]` empty

## Current Rulebook And Data Assumptions

- Production rulebook: `KR-2026.1`
- Historical dataset range: `1985-2024`
- Unsupported rulebooks must fail validation instead of silently falling back

## Current Residual Gaps

These are still known modeling limits even after the v3 contract cleanup:

- detailed tax-lot modeling is not implemented
- `interest_dividend` and `realized_capital_gain` are explicit fields but may remain zero when no detailed source model exists
- bucket strategy still needs deeper stateful refill semantics beyond the current canonical ledger alignment
- UI state still originates from `SimulationInput` in several places before canonical normalization

## Preferred Future Direction

- keep expanding canonical plan-first flows
- continue moving engine internals toward true ledger-native account behavior
- improve pension/tax detail without reintroducing contract ambiguity
