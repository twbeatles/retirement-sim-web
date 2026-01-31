# 📡 API / Usage Examples

> **Note**: This application runs entirely in the browser. There is no backend API. The examples below show how to programmatically interact with the simulation logic.

---

## 1. Running Simulation Programmatically

```typescript
import { runSimulation } from './logic/engine';
import { INITIAL_INPUT } from './logic/constants';
import type { SimulationInput, SimulationResult } from './logic/types';

// Create input
const input: SimulationInput = {
  ...INITIAL_INPUT,
  current_age: 35,
  retire_age: 60,
  end_age: 90,
  annual_inflation: 0.025,
  general: {
    current_balance: 100_000_000, // 1억원
    monthly_contribution: 2_000_000, // 월 200만원 저축
    annual_return: 0.06 // 6% 수익률
  }
};

// Run simulation
const result: SimulationResult = runSimulation(input);

console.log('Success Rate:', result.summary.successRate);
console.log('Median Assets at Retirement:', result.summary.mc?.totalAssetsReal.p50);
```

---

## 2. Using Web Worker (Recommended for UI)

```typescript
// In React component
const workerRef = useRef<Worker | null>(null);

useEffect(() => {
  workerRef.current = new Worker(
    new URL('./logic/simulation.worker.ts', import.meta.url),
    { type: 'module' }
  );

  workerRef.current.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'SUCCESS') {
      setResult(payload);
    }
  };

  return () => workerRef.current?.terminate();
}, []);

// Send input to worker
workerRef.current?.postMessage(input);
```

---

## 3. Goal Planner (Reverse Calculation)

```typescript
import { solveForMonthlyContribution, solveForRetirementAge } from './logic/solver';

// Find required monthly savings for 90% success rate
const result1 = solveForMonthlyContribution(input, 0.90, 0.01);
console.log('Required Monthly Savings:', result1.value);

// Find optimal retirement age for 85% success rate
const result2 = solveForRetirementAge(input, 0.85, 0.01);
console.log('Optimal Retirement Age:', result2.value);
```

---

## 4. IndexedDB Scenario Storage

```typescript
import { scenarioStorage } from './services/storage';

// Save scenario
const id = await scenarioStorage.saveScenario('My Plan', input);

// Load all scenarios
const scenarios = await scenarioStorage.getAllScenarios();

// Delete scenario
await scenarioStorage.deleteScenario(id);
```

---

## 5. Sample Input Object

```json
{
  "current_age": 35,
  "retire_age": 60,
  "end_age": 90,
  "annual_inflation": 0.025,
  "retirement_monthly_spending_target": 3500000,
  
  "general": {
    "current_balance": 100000000,
    "monthly_contribution": 2000000,
    "annual_return": 0.06
  },
  
  "portfolio": {
    "assets": [
      { "name": "국내주식", "allocation": 0.4, "expectedAnnualReturn": 0.08, "annualVolatility": 0.20 },
      { "name": "해외주식", "allocation": 0.3, "expectedAnnualReturn": 0.09, "annualVolatility": 0.22 },
      { "name": "채권", "allocation": 0.2, "expectedAnnualReturn": 0.04, "annualVolatility": 0.05 },
      { "name": "현금", "allocation": 0.1, "expectedAnnualReturn": 0.02, "annualVolatility": 0.01 }
    ],
    "manualCorrelation": 0.5
  },
  
  "national_pension": {
    "expected_monthly_benefit_at_retirement": 1500000,
    "inflation_linked": true,
    "startAge": 65
  },
  
  "withdrawal": {
    "strategy": "safe_withdrawal_rate",
    "initialSafeRate": 0.04
  },
  
  "simulation_settings": {
    "mc_paths": 1000,
    "seed": null
  }
}
```
