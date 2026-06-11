# API / Usage Examples

## 1. Run The Engine Directly

```ts
import { runSimulation } from "../frontend/src/logic/engine";
import { INITIAL_INPUT } from "../frontend/src/logic/constants";
import { MAX_FULL_MONTE_CARLO_PATHS } from "../frontend/src/logic/runtimeLimits";

const result = runSimulation(
  {
    ...INITIAL_INPUT,
    current_age: 40,
    retire_age: 60,
    end_age: 95,
    simulation_settings: {
      ...INITIAL_INPUT.simulation_settings,
      mode: "montecarlo",
      mc_paths: 1000,
      seed: 20260419,
    },
  },
  {
    detailLevel: "full",
    includeSampleTimelines: true,
    includeTrajectoryStats: true,
    includeSurvivalSeries: true,
    maxSampleTimelines: 5,
  }
);

console.log(result.summary.source);
console.log(result.summary.retirementPoint.totalAssetsReal);
console.log(result.summary.survivalStats.finalSurvivalRate);
console.log(MAX_FULL_MONTE_CARLO_PATHS); // 10000
```

Unknown simulation modes and Monte Carlo path counts above `MAX_FULL_MONTE_CARLO_PATHS` throw instead of falling back to deterministic execution.

## 2. Normalize To The Canonical Plan

```ts
import { legacyInputToPlan } from "../frontend/src/logic/plan";
import { INITIAL_INPUT } from "../frontend/src/logic/constants";

const plan = legacyInputToPlan(INITIAL_INPUT);
console.log(plan.planVersion); // "v3"
console.log(plan.rulebook.version); // "KR-2026.1"
```

## 3. Worker Client

```ts
import {
  requestSimulation,
  requestSimulationBatch,
  requestSolveContribution,
  requestSolveLaborSavingsRate,
  requestSolveRetireAge,
} from "../frontend/src/logic/simulationClient";
import { legacyInputToPlan } from "../frontend/src/logic/plan";

const plan = legacyInputToPlan(input);

const preview = await requestSimulation(plan, { detailLevel: "preview" });
const full = await requestSimulation(plan, { detailLevel: "full" });
const batch = await requestSimulationBatch([plan], { detailLevel: "full" });
const monthly = await requestSolveContribution(plan, 0.9);
const savingsRate = await requestSolveLaborSavingsRate(plan, 0.9);
const retireAge = await requestSolveRetireAge(plan, 0.85);
```

When a queued `requestSimulation()` payload is replaced by a newer payload in the same worker lane, the replaced promise rejects with an `AbortError`. Treat that as cancellation:

```ts
try {
  await requestSimulation(plan, { detailLevel: "preview" });
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    return;
  }
  throw error;
}
```

Result option notes:

- `includeSurvivalSeries` only controls chart payload size. `summary.survivalStats` remains populated from depletion data.
- `includeSampleTimelines=false` or `maxSampleTimelines=0` leaves `display.samples[]` empty.
- Preview and full runs use the same canonical plan payload; preview can omit representative/sample detail to keep responses small.

Worker kinds:

- `SIMULATION`
- `SIMULATION_BATCH`
- `SOLVE_CONTRIBUTION`
- `SOLVE_LABOR_SAVINGS_RATE`
- `SOLVE_RETIRE_AGE`
- `SENSITIVITY_ANALYSIS`
- `PENSION_OPTIMIZATION`

## 4. Import / Export Plan JSON

```ts
import {
  createPlanFileEnvelope,
  parseImportedPlanEnvelope,
} from "../frontend/src/logic/plan";
import { MAX_PLAN_IMPORT_BYTES } from "../frontend/src/logic/runtimeLimits";
import { validateSimulationPlan } from "../frontend/src/logic/validation";

const exported = createPlanFileEnvelope(plan);
const json = JSON.stringify(exported, null, 2);

if (new Blob([json]).size > MAX_PLAN_IMPORT_BYTES) {
  throw new Error("Plan file is too large");
}

const parsed = JSON.parse(json);
const importedPlan = parseImportedPlanEnvelope(parsed);
if (!importedPlan) {
  throw new Error("Unsupported plan file");
}

const warnings = validateSimulationPlan(importedPlan);
if (warnings.some((warning) => warning.severity === "error")) {
  throw new Error("Invalid plan");
}
```

The UI import flow additionally separates file read, abort, parse, schema, and validation failures so users can choose retry, repair, or reset/export fallback paths.

## 5. Representative And Sample Paths

```ts
import {
  getRepresentativeTimeline,
  getRepresentativeLedgerTimeline,
  getSampleDisplayPaths,
} from "../frontend/src/logic/resultDisplay";

const representativeTimeline = getRepresentativeTimeline(full);
const representativeLedger = getRepresentativeLedgerTimeline(full);
const samplePaths = getSampleDisplayPaths(full);
```

## 6. `SimulationPlanV3` Example

```json
{
  "schemaVersion": 3,
  "exportedAt": 1776556800000,
  "plan": {
    "planVersion": "v3",
    "profile": {
      "country": "KR",
      "householdType": "single",
      "currentAge": 45,
      "retirementAge": 60,
      "endAge": 95,
      "housingStatus": "own_outright",
      "longevityRisk": {
        "useDistribution": false,
        "averageLifeExpectancy": 95,
        "stdDevYears": 5
      }
    },
    "accounts": [
      {
        "id": "general_taxable",
        "type": "taxable_investment",
        "name": "Taxable investments",
        "currency": "KRW",
        "balance": 300000000,
        "monthlyContribution": 1500000,
        "taxTreatment": "taxable",
        "healthInsuranceTreatment": "assessable",
        "withdrawalPriority": 1
      }
    ],
    "incomeStreams": [
      {
        "id": "national_pension",
        "type": "national_pension",
        "name": "National pension",
        "monthlyAmount": 1800000,
        "startAge": 65,
        "annualGrowthRate": 0,
        "inflationLinked": true,
        "taxable": true,
        "healthInsuranceIncluded": true
      }
    ],
    "expensePlan": {
      "monthlyBuckets": {
        "essential": 2200000,
        "discretionary": 1000000,
        "housing": 0,
        "medical": 300000,
        "dependentSupport": 0
      },
      "oneOffEvents": [],
      "stageAdjustments": [],
      "medicalShocks": {
        "enabled": false,
        "occurrences": []
      }
    },
    "withdrawalPolicy": {
      "retirementSpendingTarget": 3500000,
      "strategy": {
        "strategy": "target_spending",
        "taxRate": 0.154,
        "taxStrategy": "detailed"
      },
      "guardrails": {
        "baseRate": 0.04,
        "upperThreshold": 0.05,
        "lowerThreshold": 0.03,
        "adjustmentRate": 0.1
      },
      "bucket": {
        "shortTermYears": 3,
        "midTermYears": 7,
        "shortTermReturn": 0.02,
        "midTermReturn": 0.04,
        "rebalanceFrequency": "annual"
      },
      "taxCredit": {
        "enabled": false,
        "mode": "law_2026",
        "lawYear": 2026,
        "incomeBasis": "simulated_taxable_income",
        "pensionSavingsContribution": 0,
        "irpContribution": 0
      },
      "healthInsurance": {
        "enabled": false,
        "mode": "simple",
        "monthlyPremium": 0,
        "inflationLinked": false
      },
      "rebalancing": {
        "enabled": true,
        "frequency": "annual",
        "taxEfficient": true,
        "tradingCostPercent": 0.001
      },
      "severance": {
        "enabled": false,
        "estimatedAmount": 0,
        "payoutType": "lump_sum"
      },
      "reverseAnnuity": {
        "enabled": false,
        "houseValue": 0,
        "startAge": 75,
        "monthlyPayment": 0
      }
    },
    "rulebook": {
      "jurisdiction": "KR",
      "version": "KR-2026.1",
      "taxYear": 2026,
      "healthInsuranceYear": 2024,
      "pensionYear": 2026,
      "historicalDataVersion": "KR-HIST-1985-2024-v1",
      "historicalDataStartYear": 1985,
      "historicalDataEndYear": 2024
    },
    "simulationSettings": {
      "mode": "montecarlo",
      "monteCarloPaths": 1000,
      "seed": 20260419,
      "annualInflation": 0.02,
      "portfolio": {
        "assetClasses": [],
        "manualCorrelation": 0
      },
      "inflationScenario": {
        "type": "normal",
        "baseRate": 0.02
      },
      "stressTest": {
        "enabled": false,
        "startFromRetirement": true,
        "durationMonths": 24,
        "annualDeclineRate": 0.2
      },
      "laborIncome": {
        "enabled": false,
        "currentNetMonthlyIncome": 0,
        "currentSavingsRate": 0,
        "events": []
      }
    }
  }
}
```

In this plan shape:

- `retirementSpendingTarget` is a current-value living-expense target.
- `taxable` determines whether the stream contributes to detailed taxable income.
- `healthInsuranceIncluded` determines whether the stream contributes to detailed health-insurance assessable income.
- `withdrawalPriority` controls supported liquid account drawdown order.
- Imported arrays such as accounts, income streams, events, stage adjustments, and medical shocks are bounded by shared collection limits before simulation.
