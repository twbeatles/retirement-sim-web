# 📐 Mathematical Modeling Notes

## 1. Asset Growth Model

이 문서는 엔진의 핵심 수학 모델을 설명합니다. 2026-04-14 기준 실제 앱은 `SimulationPlanV2` 입력을 우선 사용하지만, 내부 계산 엔진은 일부 `legacy input` 어댑터를 함께 거칩니다. 엔진 코드는 `engine.ts` 진입점과 `engine/context.ts`, `engine/summary.ts`, `engine/types.ts`, `engine/portfolio.ts` 보조 모듈로 분리되어 있습니다.

### Geometric Brownian Motion (GBM)

The simulation uses GBM for modeling asset price dynamics:

```
dS = μ·S·dt + σ·S·dW
```

**Discrete approximation (monthly)**:
```
S(t+1) = S(t) × (1 + μ_monthly + σ_monthly × Z)
```

Where:
- `μ_monthly = (1 + μ_annual)^(1/12) - 1`
- `σ_monthly = σ_annual / √12`
- `Z ~ N(0,1)` - Standard normal random variable

### Box-Muller Transform

Used to generate standard normal random numbers from uniform random numbers:

```typescript
function boxMuller(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

---

## 2. Portfolio Metrics

### Expected Return (Weighted Average)
```
E[R_p] = Σ w_i × E[R_i]
```

### Portfolio Volatility (with correlation)
```
σ_p = √(Σ Σ w_i × w_j × σ_i × σ_j × ρ_ij)
```

**Simplified (single correlation coefficient)**:
```
σ_p² = Σ w_i² × σ_i² + 2 × ρ × Σ_{i<j} w_i × w_j × σ_i × σ_j
```

---

## 3. Withdrawal Strategies

### Safe Withdrawal Rate (SWR / 4% Rule)
```
Annual Withdrawal = Initial Assets × 0.04 × (1 + inflation)^years_retired
```

### Variable Percentage Withdrawal (VPW)
```
VPW Rate = 1 / remaining_life_expectancy
Monthly = Assets × VPW_Rate / 12
```

With annual change limiter (`vpwMaxYoYChange`):
```
maxChangePerMonth = (1 + vpwMaxYoYChange)^(1/12) - 1
lowerBound = lastWithdrawal × (1 - maxChangePerMonth)
upperBound = lastWithdrawal × (1 + maxChangePerMonth)
```

### Guardrails Strategy
```
if (current_rate > ceiling):
  withdrawal *= 0.90  // -10%
if (current_rate < floor):
  withdrawal *= 1.10  // +10%
```

### Rebalancing (Threshold / Tax-efficient)
Threshold trigger:
```
trigger when max_i |actualWeight_i - targetWeight_i| > thresholdPercent
```

Tax-efficient mode:
```
buy-only rebalance (no forced sells), turnover-based trading cost
```

현재 구현 메모:

- `bucket` 전략은 실버킷 잔고 원장 대신 근사 현금흐름 방식입니다.
- `taxEfficient` 리밸런싱은 신규 유입/현금 우선의 근사 모델입니다.

---

## 4. National Pension Adjustments (Korea)

### Early Claiming (조기수령)
```
Benefit = Base × (1 - 0.06 × years_early)
Max reduction: 30% (5 years early)
```

### Delayed Claiming (연기수령)
```
Benefit = Base × (1 + 0.072 × years_delayed)
Max increase: 36% (5 years delayed)
```

---

## 5. Monte Carlo Simulation

### Success Rate Calculation
```
Success Rate = (# of paths where Assets(end_age) > 0) / total_paths
```

### Percentile Calculation
```
P(x) = value at position (x/100 × n) in sorted array
P50 = Median
P10 = 10th percentile (pessimistic)
P90 = 90th percentile (optimistic)
```

### Historical Backtest Result Semantics

Historical runs are now returned as:

```
result.mode === "historical"
result.summary.source === "historical"
```

The result summary separates:

- retirement-point assets via `summary.retirementPoint`
- terminal distribution via `summary.terminalStats`
- depletion timing via `summary.depletionStats`
- path survival via `summary.survivalStats`

---

## 6. Risk Metrics

### Sequence of Returns Risk (SoRR)
Early losses compound more severely than late losses due to:
1. Withdrawals during down markets
2. Smaller base for recovery

**Quantification**:
```
SoRR Impact = Success_Rate(normal) - Success_Rate(early_crash)
```

### Sensitivity Analysis
```
ΔP = P(base + δ) - P(base)
Where δ ∈ {-2.0%, -1.0%, 0%, +1.0%, +2.0%} for return/inflation
```

---

## 7. Plan V2 / Ledger Layer

`SimulationPlanV2` stores planning data in seven top-level groups:

- `profile`
- `accounts`
- `incomeStreams`
- `expensePlan`
- `withdrawalPolicy`
- `ruleSet`
- `simulationSettings`

Full plan simulations can emit a `ledgerTimeline` that decomposes:

- income categories
- expense buckets
- tax and health-insurance inputs
- account-level balances

This ledger layer is currently a reporting-oriented reconstruction on top of the engine timeline, not yet a fully ledger-native simulation core.
