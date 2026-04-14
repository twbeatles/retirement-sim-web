# 🗺️ Development Roadmap

## ✅ Completed Features

### Phase 1: Core Data Model & Engine
- [x] Real Estate asset type (Residential/Investment)
- [x] Pension types (DC/DB)
- [x] Business/Rental income
- [x] Engine logic updates

### Phase 2: Goal Planning & Reverse Calculation
- [x] `solver.ts` - Binary search algorithms
- [x] `GoalPlanner.tsx` - UI component

### Phase 3: Advanced Visualizations
- [x] Asset Breakdown Chart (stacked area)
- [x] Cashflow Stack Chart
- [x] Survival Curve Chart

### Phase 4: Mobile Optimization & UX
- [x] Collapsible sidebar for mobile
- [x] Chart responsiveness
- [x] Tooltip system for complex terms

### Phase 5: Technical Improvements
- [x] Web Worker for simulation (UI unblocking)
- [x] IndexedDB for local scenario storage

### Phase 6: Polish & Integration
- [x] Dark mode toggle
- [x] Documentation updates

### Phase 7: Historical Backtesting & Auto-Rebalancing ✨
- [x] Historical market data (1985-2024)
- [x] S&P 500, KOSPI, Bonds, REITs, Cash returns
- [x] Rolling window simulation (20 scenarios)
- [x] Preset scenarios (Dot-com, 2008, COVID)
- [x] Auto-rebalancing with trading costs
- [x] `BacktestingPanel.tsx` UI component
- [x] Validation for new settings

### Phase 8: Performance Refactor (2026)
- [x] Duplicate source-file guard (`check:duplicates`) and cleanup
- [x] Interaction scheduler (preview while editing, full on idle)
- [x] Section-level lazy loading for heavy asset modules
- [x] Chart module split for results section
- [x] Service worker static asset SWR cache policy
- [x] Dual-worker broker (`interactive` / `compute`) with latest-wins simulation coalescing
- [x] Input fingerprint dedupe + hidden-tab full simulation skip
- [x] Engine kernel split (sample timeline capture only, typed-array trajectory accumulation)
- [x] Results viewport-near lazy mount + chart animation disable
- [x] Scenario comparison data merge optimization (map-based)
- [x] Regression tests for worker queueing/fan-out and seed-fixed engine parity

### Phase 9: Audit Remediation (2026-02-25)
- [x] Legacy import migration (`portfolio.assets`, `retirement_monthly_spending_target`, missing mode)
- [x] VPW monthly lower-bound fix for YoY limiter
- [x] Labor-income dedicated solver path (`SOLVE_LABOR_SAVINGS_RATE`)
- [x] `mc_paths` validation + engine clamp safety guard
- [x] Depletion stats moved to full-path summary aggregation
- [x] Withdrawal strategy parity (`guardrails`, `bucket`) in UI + engine
- [x] Rebalancing threshold/tax-efficient behavior implementation
- [x] Inflation preset consistency (`low/normal/high/custom/spike`)
- [x] Retirement-point summary metric + result label alignment
- [x] Same-month event accumulation + expense definition merge preservation
- [x] Tax-credit `law_2026` integration and schema alignment
- [x] Historical source tagging (`summary.source`) and asset mapping override UI
- [x] Docs/API examples synchronized to actual worker/type contracts

---

## 🔜 Future Enhancements

### Internationalization (i18n)
- [ ] Korean/English language toggle
- [ ] Currency selector (KRW/USD/JPY)
- [ ] Locale-aware number formatting

### Testing & Quality
- [x] Unit tests with Vitest
- [x] Engine/solver regression tests for P0/P1 fixes
- [ ] E2E tests with Playwright
- [ ] Storybook component documentation

### Performance & Offline
- [ ] PWA support (offline mode)
- [ ] Runtime web-vitals dashboard
- [ ] Automatic long-task profiling in CI

### Advanced Features
- [ ] Social Security optimization (US)
- [ ] Tax-loss harvesting simulation
- [ ] Roth conversion ladder modeling
- [ ] PDF report export
- [ ] Couples/household simulation

### Phase 10: Implementation Risk Remediation (2026-03-01)
- [x] Engine input guard for invalid age relationship (`end_age <= current_age`, `retire_age > end_age`)
- [x] Auto-simulation blocking gate on validation errors
- [x] Validation policy update (`current_age === retire_age` allowed as info)
- [x] Health insurance dependent handling (`isDependent` => premium `0`)
- [x] Same-month medical shock accumulation
- [x] Inflation sensitivity sync with `inflation_scenario.baseRate`
- [x] Asset section core fields expansion (real estate/additional pensions/business income)
- [x] Historical scenario metadata single-source cleanup
- [x] Regression tests added (`engine`, `riskAnalysis`, `useAutoSimulation`)

### Phase 11: Retirement Calculator Overhaul (2026-04-14)
- [x] KR rule metadata surfaced in summaries/reports
- [x] `SimulationPlanV2` schema introduced for storage/import/export
- [x] Plan-driven simulation worker path (`PLAN_SIMULATION`, `PLAN_SIMULATION_BATCH`)
- [x] Guided checklist and plan editor added to UI
- [x] Retirement-point vs terminal-asset labeling corrected
- [x] Historical results now return `mode: "historical"`
- [x] Ledger summary and essential-spending coverage shown in results/report
- [x] Validation expanded to include `plan_v2` inputs
- [x] Raw CSV export separated from the print-style report flow
- [x] Lint tooling and CI lint step added
- [x] Large-file responsibility split for `AdvancedSettings`, `validation`, `planV2`, and engine helper modules

### Next Critical Work
- [ ] Replace `plan v2 -> legacy input -> engine` adapter path with ledger-native engine core
- [ ] Implement real short/mid/long bucket balances and refill rules
- [ ] Add detailed National Pension model beyond manual estimated benefit
- [ ] Move longevity modeling from normal distribution to life-table based assumptions
- [ ] Add golden scenarios and end-to-end regression coverage
