# 🏦 Retirement Asset Simulator Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

> **Monte Carlo Simulation-based Retirement Planning Tool for Korean Market**

[🇰🇷 한국어 버전](README.md)

---

## ✨ Key Features

### 📊 Simulation Engine
- **Monte Carlo Simulation**: 1,000+ path analysis for statistical confidence
- **GBM (Geometric Brownian Motion)**: Asset growth modeling
- **Correlation Modeling**: Portfolio-wide correlation coefficient support
- **Result Source Tagging**: Explicit `deterministic` / `montecarlo` / `historical` source in summary
- **Retirement vs Terminal Metrics**: `retirementPoint`, `terminalStats`, `depletionStats`, `survivalStats`
- **Ledger Summary**: early-retirement monthly net inflow, expense, tax, health insurance, and essential-spending coverage

### 🧭 Plan-Centered Input Model
- **`SimulationPlanV2` schema**: `profile`, `accounts`, `incomeStreams`, `expensePlan`, `withdrawalPolicy`, `ruleSet`, `simulationSettings`
- **Guided intake**: simple mode now asks for spending, pension, housing, and core assets
- **Plan editor**: direct editing for accounts, income streams, and expense buckets in pro mode
- **Rule metadata**: KR ruleset version and historical snapshot range are shown in results/reporting

### 💰 Diverse Asset Types
- **Financial Assets**: Stocks, Bonds, Cash, Alternatives
- **Real Estate**: Residential/Investment properties with rental income
- **Pensions**: National Pension (Korea), Private Pension (IRP), DC/DB Plans
- **Additional Income**: Business income, Labor income

### 📈 Withdrawal Strategies (7 Types)
1. **Fixed Amount**: Constant monthly withdrawal
2. **Fixed Percentage**: Percentage of remaining balance
3. **4% Rule (SWR)**: Initial 4% + inflation adjustment
4. **Gap Filler**: Target spending - Pension = Withdrawal
5. **VPW**: Variable Percentage based on life expectancy
6. **Guardrails**: Dynamic adjustment based on market conditions
7. **Bucket**: Short/Mid/Long bucket-based spending stability

### 📊 Historical Backtesting (NEW)
- **40 Years of Data**: Actual market returns from 1985-2024
- **Rolling Windows**: scenario count is derived dynamically from the selected start year
- **Preset Scenarios**: Dot-com crash, 2008 crisis, COVID, etc.
- **Per-Asset Historical Mapping**: `historical_asset_mapping` override support

### ⚖️ Auto-Rebalancing (NEW)
- **Frequency Options**: Monthly/Quarterly/Semi-annual/Annual/Threshold
- **Trading Cost Simulation**: Realistic rebalancing costs
- **Tax-Efficient Option**: contribution-first buy-biased approximation

### 🎯 Goal Planner (Reverse Calculator)
- Target Amount → Required Monthly Savings
- `labor_income` mode → Required savings **rate** (0~100%)
- Target Success Rate → Optimal Retirement Age

### 📱 Responsive UI & Dark Mode
- Mobile-optimized collapsible sidebar
- System-integrated dark mode
- Touch-friendly sliders

---

## 📌 Current Scope And Limitations

- The current target is a Korea-specific single-household retirement calculator.
- Rules and historical datasets are local/versioned assets and are surfaced in the result metadata.
- User-facing print reports and raw CSV exports are intentionally separated.
- `bucket`, `tax-efficient rebalancing`, detailed National Pension formulas, and life-table longevity are still mid-migration.
- Final full simulations are plan-driven, but the engine still includes a `plan v2 -> legacy input -> engine` adapter layer internally.
- As of the 2026-04-14 refactor, `AdvancedSettings`, `validation`, `planV2`, and `engine` are split into smaller responsibility-focused modules internally.

---

## 🏗️ Project Structure

```
retirement-sim-web/
├── frontend/
│   ├── src/
│   │   ├── components/           # UI Components
│   │   │   ├── Charts/           # Visualization Charts
│   │   │   │   ├── AssetBreakdownChart.tsx
│   │   │   │   ├── CashflowStackChart.tsx
│   │   │   │   ├── FanChart.tsx
│   │   │   │   └── SurvivalChart.tsx
│   │   │   ├── common/           # Common UI Elements
│   │   │   │   └── UIComponents.tsx
│   │   │   ├── layout/           # Responsive Layout
│   │   │   │   ├── DesktopLayout.tsx
│   │   │   │   ├── MobileLayout.tsx
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── sections/
│   │   │   │   └── types.ts
│   │   │   ├── ui/               # Reusable UI Components
│   │   │   │   ├── InputSlider.tsx
│   │   │   │   └── MoneyInput.tsx
│   │   │   ├── advanced-settings/ # Advanced settings sub-sections
│   │   │   ├── AdvancedSettings.tsx
│   │   │   ├── BacktestingPanel.tsx  # Historical Backtesting UI
│   │   │   ├── Charts.tsx        # Chart Container
│   │   │   ├── ExpenseManager.tsx # Expense Management
│   │   │   ├── FavoriteAssets.tsx # Favorite Assets
│   │   │   ├── GoalPlanner.tsx   # Reverse Calculator
│   │   │   ├── IncomeManager.tsx # Income Management
│   │   │   ├── Onboarding.tsx    # Onboarding Wizard
│   │   │   ├── PensionOptimizer.tsx # Pension Optimization
│   │   │   ├── PlanGuidedChecklist.tsx
│   │   │   ├── PlanV2Editor.tsx
│   │   │   ├── PortfolioEditor.tsx
│   │   │   ├── RiskDashboard.tsx
│   │   │   ├── ScenarioComparison.tsx # Scenario Comparison
│   │   │   ├── ScenarioManager.tsx
│   │   │   ├── SimpleDashboard.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── WhatIfSlider.tsx
│   │   │   ├── WithdrawalSettings.tsx
│   │   │   └── YearlyReportTable.tsx
│   │   │
│   │   ├── hooks/                # Custom React Hooks
│   │   │   ├── useAutoSimulation.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   └── useSimulation.ts  # Simulation State Management
│   │   │
│   │   ├── logic/                # Core Business Logic
│   │   │   ├── engine/           # Engine context / summary / types
│   │   │   ├── engine.ts         # Simulation engine entrypoint
│   │   │   ├── simulation.worker.ts  # Web Worker
│   │   │   ├── workerTypes.ts    # Worker Communication Types
│   │   │   ├── solver.ts         # Reverse Calculation
│   │   │   ├── migration.ts      # Legacy schema migration
│   │   │   ├── riskAnalysis.ts   # Risk Analysis
│   │   │   ├── types.ts          # TypeScript Type Definitions
│   │   │   ├── constants.ts      # Initial Values/Constants
│   │   │   ├── math.ts           # Math Utilities
│   │   │   ├── planV2/           # Plan schema subtypes / converters
│   │   │   ├── planV2.ts         # plan v2 barrel export
│   │   │   ├── validation/       # Validation submodules
│   │   │   ├── validation.ts     # Input validation entrypoint
│   │   │   ├── historicalData.ts # Historical Data
│   │   │   ├── historicalScenarioMeta.ts # Historical Scenario Metadata
│   │   │   ├── koreaTax.ts       # Korea Tax & Pension Math
│   │   │   ├── planSimulation.ts # plan v2 simulation entrypoint
│   │   │   ├── rules/
│   │   │   │   └── kr.ts         # KR rules and metadata
│   │   │   ├── uiConstants.ts
│   │   │   └── export.ts         # Raw CSV export
│   │   │
│   │   ├── services/             # Service Layer
│   │   │   └── storage.ts        # IndexedDB Scenario Storage
│   │   │
│   │   ├── utils/                # Utilities
│   │   │   └── format.ts
│   │   │
│   │   ├── App.tsx               # Main App Component
│   │   ├── index.css             # Global Styles (incl. Dark Mode)
│   │   └── main.tsx              # Entry Point
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # Documentation
│   ├── modeling_notes.md
│   ├── api_examples.md
│   └── roadmap.md
│
├── backup/                       # Backup Files
├── GEMINI.md                     # AI Context (Business Logic)
├── CLAUDE.md                     # AI Context (Dev Guide)
└── README.md                     # Korean README
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Running

```bash
# Clone repository
git clone https://github.com/twbeatles/retirement-sim-web.git
cd retirement-sim-web/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Production build
npm run build

# Refactor safety verification
npm run verify:refactor

# Lint + typecheck + test + build
npm run verify:pr
```

---

## 🔧 Tech Stack

| Area | Technology |
|------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Charting** | Recharts |
| **Styling** | Vanilla CSS (CSS Variables) |
| **State Management** | React useState/useEffect |
| **Storage** | IndexedDB (Local Scenarios) |
| **Performance** | Web Workers |

---

## 📚 Documentation

- [GEMINI.md](GEMINI.md) - Simulation Engine Business Logic Details
- [CLAUDE.md](CLAUDE.md) - Developer Guide and Code Conventions
- [docs/modeling_notes.md](docs/modeling_notes.md) - Mathematical Modeling Notes
- [docs/api_examples.md](docs/api_examples.md) - Current input schema and worker protocol examples
- [docs/roadmap.md](docs/roadmap.md) - Development Roadmap
- [docs/retirement_calculator_readiness_review_2026-04-14.md](docs/retirement_calculator_readiness_review_2026-04-14.md) - Practical-readiness review and implementation status

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Contributing

Bug reports, feature suggestions, and PRs are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Performance Architecture (2026 Refactor)

- Dual worker lanes:
  - `interactive`: preview simulation
  - `compute`: full simulation, batch compare, solver, sensitivity, pension optimization
- Simulation queue policy:
  - latest-wins coalescing by detail level (`preview` / `full`)
  - per-lane queue cap: `inFlight 1 + queued 1`
  - promise fan-out for queued callers
- Auto scheduler:
  - input fingerprint dedupe for preview/full requests
  - skip full simulation while tab is hidden
- Engine/runtime:
  - timeline objects only for sampled paths
  - typed-array accumulation for trajectory/survival stats
- UI rendering:
  - heavy results blocks mount near viewport
  - chart animations disabled for lower first-render cost

---

## 2026-03-01 Stability Update

All items from `IMPLEMENTATION_RISK_REVIEW_2026-03-01.md` (P0~P2) are now implemented:

- Engine input safety guard:
  - throw when `end_age <= current_age`
  - throw when `retire_age > end_age`
- Validation/runtime alignment:
  - `current_age === retire_age` is valid (`info`)
  - auto-simulation scheduler is blocked while validation has `error`
- Health insurance (detailed mode):
  - `isDependent === true` => premium fixed to `0`
- Medical shocks:
  - same-month events are accumulated (`existing + amount`)
- Inflation sensitivity fix:
  - `annual_inflation` sensitivity updates both `annual_inflation` and `inflation_scenario.baseRate`
- Assets UI core field expansion:
  - real estate: `type`, `growthRate`, `rentalYield`, `managementCost`
  - additional pensions: `type`, `monthlyContribution`, `expectedReturn`, `payoutType`, `payoutYears`, `monthlyPayout`
  - business income: `growthRate`, `endAge`
- Historical metadata cleanup:
  - duplicate scenario exports removed from `historicalData.ts`

Verification snapshot (2026-03-01):

- `npm run typecheck` passed
- `npm run test -- --run` passed
- `npm run verify:pr` passed

---

## 2026-04-14 Retirement Calculator Update

- Added `SimulationPlanV2` storage, editing, and JSON export/import
- Added `retirementPoint`, `terminalStats`, `depletionStats`, `survivalStats`, `ruleMetadata`, and `assumptionWarnings`
- Historical backtests now return `mode: "historical"` explicitly
- Added ledger summary and essential-spending coverage to results/reporting
- Separated raw CSV export from the print-style report flow
- Expanded validation to cover both legacy and `plan_v2` inputs
- Updated local storage to persist plan-centered scenarios

Verification snapshot (2026-04-14):

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test -- --run` passed
- `npm run build` passed
