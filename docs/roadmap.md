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

---

## 🔜 Future Enhancements

### Internationalization (i18n)
- [ ] Korean/English language toggle
- [ ] Currency selector (KRW/USD/JPY)
- [ ] Locale-aware number formatting

### Testing & Quality
- [ ] Unit tests with Vitest
- [ ] E2E tests with Playwright
- [ ] Storybook component documentation

### Performance & Offline
- [ ] PWA support (offline mode)
- [ ] Service worker caching
- [ ] Lazy loading for charts

### Advanced Features
- [ ] Social Security optimization (US)
- [ ] Tax-loss harvesting simulation
- [ ] Roth conversion ladder modeling
- [ ] PDF report export
- [ ] Couples/household simulation

