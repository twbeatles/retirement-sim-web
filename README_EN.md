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

### 💰 Diverse Asset Types
- **Financial Assets**: Stocks, Bonds, Cash, Alternatives
- **Real Estate**: Residential/Investment properties with rental income
- **Pensions**: National Pension (Korea), Private Pension (IRP), DC/DB Plans
- **Additional Income**: Business income, Labor income

### 📈 Withdrawal Strategies (6 Types)
1. **Fixed Amount**: Constant monthly withdrawal
2. **Fixed Percentage**: Percentage of remaining balance
3. **4% Rule (SWR)**: Initial 4% + inflation adjustment
4. **Gap Filler**: Target spending - Pension = Withdrawal
5. **VPW**: Variable Percentage based on life expectancy
6. **Guardrails**: Dynamic adjustment based on market conditions

### 📊 Historical Backtesting (NEW)
- **40 Years of Data**: Actual market returns from 1985-2024
- **Rolling Windows**: 20 automatic scenario tests
- **Preset Scenarios**: Dot-com crash, 2008 crisis, COVID, etc.

### ⚖️ Auto-Rebalancing (NEW)
- **Frequency Options**: Monthly/Quarterly/Semi-annual/Annual/Threshold
- **Trading Cost Simulation**: Realistic rebalancing costs
- **Tax-Efficient Option**: Buy-only rebalancing

### 🎯 Goal Planner (Reverse Calculator)
- Target Amount → Required Monthly Savings
- Target Success Rate → Optimal Retirement Age

### 📱 Responsive UI & Dark Mode
- Mobile-optimized collapsible sidebar
- System-integrated dark mode
- Touch-friendly sliders

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
│   │   │   │   └── SurvivalChart.tsx
│   │   │   ├── ui/               # Reusable UI Components
│   │   │   │   ├── InputSlider.tsx
│   │   │   │   └── MoneyInput.tsx
│   │   │   ├── AdvancedSettings.tsx
│   │   │   ├── Charts.tsx        # Chart Container
│   │   │   ├── FavoriteAssets.tsx # Favorite Assets
│   │   │   ├── GoalPlanner.tsx   # Reverse Calculator
│   │   │   ├── IncomeManager.tsx
│   │   │   ├── Onboarding.tsx    # Onboarding Wizard
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
│   │   │   └── useSimulation.ts  # Simulation State Management
│   │   │
│   │   ├── logic/                # Core Business Logic
│   │   │   ├── engine.ts         # Simulation Engine
│   │   │   ├── simulation.worker.ts  # Web Worker
│   │   │   ├── workerTypes.ts    # Worker Communication Types
│   │   │   ├── solver.ts         # Reverse Calculation
│   │   │   ├── riskAnalysis.ts   # Risk Analysis
│   │   │   ├── types.ts          # TypeScript Type Definitions
│   │   │   ├── constants.ts      # Initial Values/Constants
│   │   │   ├── math.ts           # Math Utilities
│   │   │   ├── validation.ts     # Input Validation
│   │   │   └── export.ts         # CSV Export
│   │   │
│   │   ├── services/             # Service Layer
│   │   │   └── storage.ts        # IndexedDB Scenario Storage
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
git clone https://github.com/your-repo/retirement-sim-web.git
cd retirement-sim-web/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Production build
npm run build
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
- [docs/roadmap.md](docs/roadmap.md) - Development Roadmap

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
