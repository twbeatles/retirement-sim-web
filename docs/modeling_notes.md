# 📐 Mathematical Modeling Notes

## 1. Asset Growth Model

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
- `μ_monthly = μ_annual / 12`
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

### Guardrails Strategy
```
if (current_rate > ceiling):
  withdrawal *= 0.90  // -10%
if (current_rate < floor):
  withdrawal *= 1.10  // +10%
```

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
Where δ ∈ {±0.5%, ±1.0%} for return/inflation
```
