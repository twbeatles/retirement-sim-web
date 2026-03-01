# API / Usage Examples

이 프로젝트는 브라우저 내에서만 동작합니다. 아래 예시는 `frontend/src/logic` 및 Worker 인터페이스를 코드에서 직접 사용하는 방법입니다.

---

## 1. 시뮬레이션 직접 실행

```ts
import { runSimulation } from "../frontend/src/logic/engine";
import { INITIAL_INPUT } from "../frontend/src/logic/constants";
import type { SimulationInput } from "../frontend/src/logic/types";

const input: SimulationInput = {
    ...INITIAL_INPUT,
    current_age: 40,
    retire_age: 60,
    end_age: 95,
    simulation_settings: {
        ...INITIAL_INPUT.simulation_settings,
        mode: "montecarlo",
        mc_paths: 1000,
        seed: 20260225
    }
};

const result = runSimulation(input, {
    detailLevel: "full",
    includeSampleTimelines: true,
    includeTrajectoryStats: true,
    includeSurvivalSeries: true,
    maxSampleTimelines: 5
});

console.log(result.summary.source); // deterministic | montecarlo | historical
console.log(result.summary.retirementPoint.totalAssetsReal);
console.log(result.summary.depletion?.neverDepletedRate);
```

---

## 2. Web Worker 클라이언트 사용

```ts
import {
    requestSimulation,
    requestSolveContribution,
    requestSolveLaborSavingsRate,
    requestSolveRetireAge
} from "../frontend/src/logic/simulationClient";

const sim = await requestSimulation(input, { detailLevel: "preview" });
const monthly = await requestSolveContribution(input, 0.9);
const savingsRate = await requestSolveLaborSavingsRate(input, 0.9);
const retireAge = await requestSolveRetireAge(input, 0.85);
```

Worker `kind` 목록 (`frontend/src/logic/workerTypes.ts`):

- `SIMULATION`
- `SIMULATION_BATCH`
- `SOLVE_CONTRIBUTION`
- `SOLVE_LABOR_SAVINGS_RATE`
- `SOLVE_RETIRE_AGE`
- `SENSITIVITY_ANALYSIS`
- `PENSION_OPTIMIZATION`

---

## 3. Import JSON 마이그레이션

```ts
import { migrateSimulationInput } from "../frontend/src/logic/migration";
import { validateSimulationInput } from "../frontend/src/logic/validation";

const parsed = JSON.parse(fileText) as Record<string, unknown>;
const migrated = migrateSimulationInput(parsed);
const warnings = validateSimulationInput(migrated);

if (warnings.some((w) => w.severity === "error")) {
    throw new Error("Invalid scenario");
}
```

`migrateSimulationInput`은 구스키마 예시를 자동 승격합니다.

- `portfolio.assets` -> `portfolio.assetClasses`
- `retirement_monthly_spending_target` -> `withdrawal.targetMonthlySpending`
- 누락된 `simulation_settings.mode` -> `"montecarlo"`

---

## 4. 최신 입력 스키마 예시 (축약)

```json
{
  "current_age": 35,
  "retire_age": 60,
  "end_age": 95,
  "annual_inflation": 0.02,
  "general": {
    "current_balance": 50000000,
    "monthly_contribution": 1500000
  },
  "portfolio": {
    "assetClasses": [
      {
        "id": "stock",
        "name": "주식",
        "expectedAnnualReturn": 0.09,
        "annualVolatility": 0.18,
        "allocation": 0.6
      },
      {
        "id": "bond",
        "name": "채권",
        "expectedAnnualReturn": 0.04,
        "annualVolatility": 0.06,
        "allocation": 0.4
      }
    ],
    "manualCorrelation": 0.2
  },
  "withdrawal": {
    "strategy": "vpw",
    "taxStrategy": "detailed",
    "taxRate": 0.154,
    "vpwMaxYoYChange": 0.1
  },
  "simulation_settings": {
    "mode": "historical",
    "mc_paths": 1000,
    "historical_start_year": 1998,
    "historical_asset_mapping": {
      "stock": "us_stock",
      "bond": "us_bond"
    }
  },
  "rebalancing": {
    "enabled": true,
    "frequency": "threshold",
    "thresholdPercent": 0.05,
    "taxEfficient": true,
    "tradingCostPercent": 0.001
  },
  "tax_credit": {
    "enabled": true,
    "mode": "law_2026",
    "lawYear": 2026,
    "incomeBasis": "simulated_taxable_income",
    "pensionSavingsContribution": 6000000,
    "irpContribution": 3000000
  },
  "expense_definitions": [
    {
      "id": "exp_1",
      "name": "차량 교체",
      "amount": 30000000,
      "startAge": 52,
      "isRecurring": false
    }
  ]
}
```

---

## 5. Historical 모드 반환 규칙

호환성 유지를 위해 결과 `mode`는 `"montecarlo"`를 유지합니다.  
Historical 여부는 `result.summary.source === "historical"`로 판별합니다.

---

## 6. 2026-03-01 Schema/Behavior Notes

### Age guard behavior

`runSimulation` now throws early when:

- `end_age <= current_age`
- `retire_age > end_age`

### Auto simulation scheduling guard

UI auto-simulation (`useAutoSimulation`) should be gated by validation:

- if any validation item has `severity === "error"`, skip scheduling preview/full timers
- resume scheduling automatically when blocking errors are cleared

### Health insurance detailed mode

When `health_insurance.mode === "detailed"` and `isDependent === true`, premium is `0`.

```json
{
  "health_insurance": {
    "enabled": true,
    "mode": "detailed",
    "isDependent": true,
    "propertyValue": 0,
    "carValue": 0,
    "monthlyPremium": 0,
    "inflationLinked": false
  }
}
```

### Medical shocks accumulation

If multiple medical shock occurrences map to the same month, the engine accumulates all amounts.

```json
{
  "medical_shocks": {
    "enabled": true,
    "occurrences": [
      { "age": 65, "amount": 1000000 },
      { "age": 65, "amount": 2000000 }
    ]
  }
}
```

### Expanded asset-input examples

```json
{
  "realEstate": [
    {
      "id": "re1",
      "name": "Investment Home",
      "type": "investment",
      "currentValue": 500000000,
      "growthRate": 0.02,
      "rentalYield": 0.03,
      "managementCost": 0.005
    }
  ],
  "additionalPensions": [
    {
      "id": "p1",
      "name": "DC Pension",
      "type": "dc",
      "currentValue": 30000000,
      "monthlyContribution": 300000,
      "expectedReturn": 0.04,
      "startAge": 60,
      "payoutType": "fixed_period",
      "payoutYears": 20
    }
  ],
  "businessIncome": [
    {
      "id": "b1",
      "name": "Consulting",
      "monthlyIncome": 2000000,
      "growthRate": 0.01,
      "startAge": 50,
      "endAge": 65
    }
  ]
}
```
