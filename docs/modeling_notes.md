# Mathematical Modeling Notes

## Overview

The engine still accepts `SimulationInput` at some local entrypoints, but the active runtime contract is the canonical `SimulationPlanV3`. Worker requests, storage, exports, and report consumers are all aligned to the v3 plan and its resolved rulebook.

## Asset Growth Model

The simulator uses a GBM-style monthly return process for stochastic paths.

```text
dS = mu * S * dt + sigma * S * dW
```

Monthly approximation:

```text
S(t+1) = S(t) * (1 + mu_monthly + sigma_monthly * Z)
```

Where:

- `mu_monthly = (1 + mu_annual)^(1/12) - 1`
- `sigma_monthly = sigma_annual / sqrt(12)`
- `Z ~ N(0, 1)`

## Portfolio Metrics

Expected return:

```text
E[R_p] = sum(w_i * E[R_i])
```

Approximate volatility:

```text
sigma_p^2 = sum(sum(w_i * w_j * sigma_i * sigma_j * rho_ij))
```

## Withdrawal Strategies

The engine supports:

- fixed amount
- target spending
- fixed percentage
- safe withdrawal rate
- VPW
- guardrails
- bucket

## Spending Contract

`targetMonthlySpending` in legacy UI state and `withdrawalPolicy.retirementSpendingTarget` in `SimulationPlanV3` both mean current-value monthly living expenses. During retirement months, `target_spending` and `bucket` strategies multiply that target by the simulated CPI factor before calculating nominal cash needs.

Taxes and health-insurance premiums are not embedded in the living-expense target. They are calculated as separate monthly costs, deducted from assets, and surfaced consistently in timeline, ledger, CSV export, and report consumers.

Mortgage payments are debt service. They count in total expenses through the debt-service source and must not be double-counted as the housing bucket.

## Plan-Aware V3 Fields

The v3 plan-aware execution path applies these fields during calculation:

- `incomeStreams[].taxable`
- `incomeStreams[].healthInsuranceIncluded`
- `accounts[].withdrawalPriority`

`taxable=false` excludes the active income stream from detailed taxable-income calculations. `healthInsuranceIncluded=false` excludes the active stream from detailed health-insurance assessable income. Liquid account withdrawal priority currently covers cash, taxable-investment, and private-pension account groups; debt and owner-occupied housing accounts are excluded from drawdown sources.

## Canonical Monthly Cashflow Sources

The canonical timeline source map tracks these buckets directly:

- `salary`
- `businessIncome`
- `rentalIncome`
- `nationalPension`
- `privatePension`
- `additionalPension`
- `severance`
- `reverseMortgage`
- `interestDividend`
- `realizedCapitalGain`
- `withdrawalPrincipal`
- `oneOffIncome`
- `oneOffExpense`
- `medicalShock`
- `housingCost`
- `debtService`
- `tradingCost`

Tax and health-insurance calculations should be derived from these canonical sources instead of an undifferentiated gross withdrawal number.

## Rulebook Resolution

The rulebook is resolved explicitly through the Korea rules module. Unsupported year/version combinations are validation errors. There is no silent fallback to "latest".

Current supported production rulebook:

- `KR-2026.1`

Historical dataset range:

- `1985-2024`

## Result Semantics

Deterministic results expose a single representative path.

Probabilistic results expose:

- `summary`
- `trajectoryStats`
- `survivalSeries`
- `display.representative`
- `display.samples[]`

`summary.survivalStats` is derived from depletion data regardless of whether `survivalSeries` is requested. `survivalSeries` is a chart payload only.

`includeSampleTimelines=false` or `maxSampleTimelines=0` suppresses both legacy sample timelines and `display.samples[]`. Full-detail runs should retain `display.representative`; preview runs may omit detail-heavy display payloads.

The representative path is selected by:

1. closest `finalTotalAssetsReal` to p50
2. tie-break by closest retirement-point real assets to p50
3. tie-break by distance to median depletion age
4. lowest path index

## Ledger Layer

Full-detail runs may emit a `ledgerTimeline` alongside the representative path. Reports and exports should prefer representative-path ledger data and treat sample paths as explicitly secondary views.

## Compatibility Layer

`SimulationPlanV2` still exists in the repo because:

- old JSON files may still be imported
- some UI state still starts from legacy input
- some tests still cover v2 migration behavior

That compatibility layer is not the active runtime contract.
