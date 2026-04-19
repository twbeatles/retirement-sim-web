# Development Roadmap

## Completed

### Phase 1-10

- Core simulation engine, charts, mobile UX, worker execution, historical backtesting, rebalancing, validation hardening, and solver tooling
- Performance guardrails and CI automation
- Historical mode separation and reporting cleanup

### Phase 11: Plan-Driven Overhaul

- `SimulationPlanV2` storage, editing, and import/export
- Guided checklist and plan editor in the UI
- KR rule metadata surfaced in results and reports
- Ledger summary and essential-spending coverage in results/reporting
- CSV export separated from print-style reporting

### Phase 12: SimulationPlanV3 Runtime Alignment (2026-04-19)

- `SimulationPlanV3` promoted as the canonical runtime/storage/export plan
- Worker/client API moved to plan-only requests
- `schemaVersion: 3` storage/export contract adopted
- representative-path and labeled sample-path display helpers added
- rulebook resolution upgraded from metadata display to calculation input
- canonical plan validation added
- IndexedDB reset notice flow added for local schema cuts
- docs synchronized to the new contract

## In Progress / Next

- Move more UI state directly to canonical plan objects instead of legacy-first state
- Deepen bucket strategy into explicit short/mid/long refill behavior
- Expand detailed income-source modeling for taxable investment accounts
- Add broader end-to-end coverage for simple mode, advanced editor, report, and export flows

## Planned

### Product And Modeling

- richer National Pension modeling
- life-table based longevity assumptions
- household / couple scenarios
- clearer user-facing assumptions and warning surfaces

### Quality And Operations

- more golden scenario coverage
- E2E regression tests
- versioned historical-data refresh process
- more formal change logs for rulebook/data updates
