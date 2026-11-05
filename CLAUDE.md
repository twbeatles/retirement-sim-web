# CLAUDE.md

Developer guide for the current codebase contract.

## Architecture

```text
frontend/src/
  components/            # React UI
    plan-editor/         # SimulationPlanV3 editor sections
    scenario-manager/    # scenario preset/helper modules
    scenario-comparison/ # comparison chart/table helpers
    risk-dashboard/      # risk-analysis tab panels
    what-if/             # what-if slider config/helpers
    income-manager/      # labor-income parsing/chart helpers
    simple-dashboard/    # compact dashboard display helpers
  hooks/                 # UI orchestration hooks
  logic/
    engine/              # run config, mode guards, path returns, distribution stats, path replay/selection
    featureTypes.ts      # Phase 1-7 extension types
    types.ts             # public type facade for existing imports
    plan/                # SimulationPlanV3 schema/converters
    planV2/              # import-only compatibility helpers
    rules/               # rulebook resolution
    validation/          # canonical validation facade plus V3 shape/enum/runtime-policy helpers
    simulation.worker.ts # worker entrypoint
    simulationClient.ts  # worker client queueing/coalescing
    resultDisplay.ts     # representative/sample path helpers
    export.ts            # CSV/report shaping
  services/
    storage.ts           # IndexedDB scenario storage
```

## Source Of Truth

- Canonical runtime/storage/export type: `SimulationPlanV3`
- Canonical result display contract: `result.display.representative` and `result.display.samples[]`
- `SimulationPlanV2` is import migration input only
- `SimulationInput` is still used by parts of the UI, but runtime boundaries normalize into `SimulationPlanV3`
- Keep `logic/types.ts`, `ScenarioManager`, `ScenarioComparison`, `RiskDashboard`, `WhatIfSlider`, `runSimulation(...)`, and `simulateOnePath(...)` as compatibility facades unless a coordinated import migration is planned.
- Put new feature-specific UI helpers under the matching feature folder instead of growing top-level component files.
- User-facing UI copy is Korean-first; keep README_EN and developer-only docs in English where helpful.

## Plan-Aware Calculation Rules

- `incomeStreams[].taxable` controls whether that income source contributes to detailed taxable income.
- `incomeStreams[].healthInsuranceIncluded` controls detailed health-insurance assessable income.
- Liquid account drawdown follows `accounts[].withdrawalPriority` for supported cash, taxable-investment, and private-pension account groups.
- Debt and owner-occupied housing accounts are not withdrawal sources.
- `targetMonthlySpending` and `retirementSpendingTarget` are current-value living-expense targets. The engine CPI-indexes them in monthly retirement cashflow and treats tax and health insurance as separate expenses.

## Worker API

Only these kinds are part of the active contract:

- `SIMULATION`
- `SIMULATION_BATCH`
- `SOLVE_CONTRIBUTION`
- `SOLVE_LABOR_SAVINGS_RATE`
- `SOLVE_RETIRE_AGE`
- `SENSITIVITY_ANALYSIS`
- `PENSION_OPTIMIZATION`

Do not introduce new public `PLAN_SIMULATION*` kinds.

`requestSimulation(...)` uses latest-wins coalescing for queued preview/full
requests. When a queued payload is replaced by a newer payload, the replaced
callers are rejected with `AbortError`; UI code should treat that as cancellation
and avoid surfacing it as a user-visible failure.

## Runtime Limits

- Full Monte Carlo runs are capped at `MAX_FULL_MONTE_CARLO_PATHS = 10_000`.
- Imported JSON files are capped at `MAX_PLAN_IMPORT_BYTES = 1MB`.
- Large imported plan collections are capped at `MAX_PLAN_COLLECTION_ITEMS = 500`.
- Keep UI controls, validators, and engine defenses tied to these shared constants.

## Validation Rules

- Validate the resolved rulebook, not just metadata fields.
- Validate canonical plan buckets and income streams through `validateSimulationPlan(...)`.
- Unsupported rulebooks must fail validation instead of silently falling back.
- Keep shared runtime limits and simulation mode policy in `validation/runtimePolicy.ts`; keep V3 shape and enum checks in their dedicated helper modules.

## Result Consumption Rules

- Prefer `resultDisplay.ts` helpers over reading raw path arrays directly.
- Default reports, charts, CSV, and comparisons to the representative path.
- Show labeled sample paths as explicitly separate data.
- `summary.survivalStats` must remain correct even when `includeSurvivalSeries` is false.
- `includeSampleTimelines=false` and `maxSampleTimelines=0` must leave `display.samples[]` empty.

## Storage Rules

- IndexedDB stores `schemaVersion: 3` plus `SimulationPlanV3`.
- Older local stores are reset on version cut.
- The UI must surface reset, load-failure, and JSON import/export fallback guidance.
- JSON import accepts UTF-8 V2/V3 plan envelopes only and must separate parse,
  schema, validation, read error, and abort messages for users.
- LocalStorage reset notices are best-effort only; failures must not abort an
  IndexedDB upgrade.
- IndexedDB blocked/versionchange paths should close stale handles or surface a
  retryable storage message.
- Corrupt scenario records should be skipped record-by-record when possible, with
  a user-visible count.

## Testing And Verification

```bash
cd frontend
npm run typecheck
npm run test -- --run
npm run build
npm run verify:ci
```

## Compatibility Notes

- `planV2/` and `migration.ts` remain because imported JSON may still arrive in older shapes.
- Legacy-named files may remain in place, but new behavior should target canonical v3 contracts.

<!-- SPECKIT-AGENT-GUIDE:START -->

## Spec Kit / Spec-Driven Development (AI 에이전트 필독)

> 이 블록은 GitHub Spec Kit 활성화 및 기능 명세 작업 결과를 AI 에이전트가 바로 쓰도록 정리한 안내입니다.
> 수정 시 마커 주석을 유지하세요. 스크립트/후속 세션이 이 구간을 갱신합니다.

### 이 저장소 상태

- **프로젝트**: `retirement-sim-web`
- **Spec Kit 초기화**: `.specify/ 있음`
- **에이전트 스킬**: Grok=True, Claude=True, Codex/Agy(.agents)=True
- **활성 기능**: 아직 `specs/` 기능 명세 없음 — `.specify/` 만 준비된 상태

### 에이전트가 먼저 읽을 파일

1. `.specify/` 및 `.grok/skills` / `.claude/skills` / `.agents/skills` 의 `speckit-*`
2. 기능 작업 시작 시 `/speckit-specify` 로 `specs/00N-...` 생성

### 권장 워크플로 (스킬 / 슬래시 커맨드)

| 단계 | 커맨드 (Grok/Claude 등) | 산출 |
|------|-------------------------|------|
| 원칙 | `/speckit-constitution` | `.specify/memory/constitution.md` |
| 명세 | `/speckit-specify` | `specs/<id>/spec.md` |
| 계획 | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| 작업 | `/speckit-tasks` | `tasks.md` |
| 구현 | `/speckit-implement` | 코드 (tasks 순서) |
| 갭점검 | `/speckit-converge` | `tasks.md` 에 Phase Convergence **append-only** |

- Codex skills 모드: `$speckit-specify` 형태일 수 있음
- 스킬 파일: `.grok/skills/speckit-*/SKILL.md`, `.claude/skills/speckit-*/SKILL.md`

### 작업 규칙 (에이전트)

1. **새 기능/큰 변경 전** 활성 `spec.md`·`tasks.md` 를 읽고, 없으면 specify→plan→tasks 순으로 만든다.
2. **구현은 tasks.md 체크리스트**를 따른다. 완료 시 `- [ ]` → `- [x]`.
3. **`/speckit-converge` 는 tasks.md 를 rewrite 하지 않는다** — 잔여 갭만 하단 Phase 로 append.
4. brownfield 프로젝트는 상당 기능이 이미 있을 수 있다. 중복 구현 전에 코드·`[x]` 태스크를 확인한다.
5. 웹/데스크톱 패리티 등 **out-of-scope Assumptions** 는 새 feature 로 분리하는 것을 선호한다.
6. 기본 integration 은 **grok** 이며, 동일 레포에 claude / codex / agy 스킬도 multi-install 되어 있을 수 있다.

### 관련 링크

- Spec Kit: https://github.com/github/spec-kit
- 로컬 CLI: `specify` (uv tool, 버전은 `specify version`)

<!-- SPECKIT-AGENT-GUIDE:END -->
