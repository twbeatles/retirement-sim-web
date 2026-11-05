# GEMINI.md

Domain guide for the retirement simulator.

## Product Intent

The product aims to model retirement cashflow durability for Korean households through simulation, reporting, and scenario comparison. The core product trust factors are:

- rulebook transparency
- plan/input consistency
- explainable cashflow outputs
- stable result labeling

## Canonical Runtime Contract

- Canonical plan: `SimulationPlanV3`
- Canonical rule selection: resolved `plan.rulebook`
- Canonical result display:
  - `display.representative`
  - `display.samples[]`

Compatibility layers still exist for legacy inputs and `SimulationPlanV2` imports, but those are not the active runtime contract.

## Runtime Guardrails

- Full Monte Carlo runs are capped at `MAX_FULL_MONTE_CARLO_PATHS = 10_000` across UI, validation, and engine guard code.
- Imported JSON plan files are capped at `MAX_PLAN_IMPORT_BYTES = 1MB` and must be UTF-8 V2/V3 plan envelopes.
- Imported plan collections are capped at `MAX_PLAN_COLLECTION_ITEMS = 500` before deeper validation.
- Unsupported simulation modes, invalid seeds, unsupported enum values, duplicate IDs, and broken plan references should fail validation instead of falling back.
- Engine mode selection must throw for unknown modes; deterministic fallback is not acceptable.
- `requestSimulation()` latest-wins coalescing rejects replaced queued callers with `AbortError`; UI consumers should treat that as cancellation.
- IndexedDB reset notices are best-effort. Storage load should skip corrupt records when possible and keep healthy scenarios visible.

## Engine Model

The engine still uses monthly portfolio projection with stochastic and historical variants. Core modeling areas:

- asset return generation
- retirement spending / withdrawal strategy
- pension cashflows
- tax and health-insurance estimation
- one-off expense and medical-shock handling
- historical-path replay

## Plan-Aware V3 Fields

These `SimulationPlanV3` fields are part of the active calculation path, not metadata-only fields:

- `incomeStreams[].taxable`
- `incomeStreams[].healthInsuranceIncluded`
- `accounts[].withdrawalPriority`

Liquid withdrawal ordering supports cash, taxable investment, and private-pension account groups. Debt and owner-occupied housing accounts are excluded from withdrawal sources.

## Canonical Cashflow Sources

The monthly source map should be treated as the primary decomposition for taxation, reporting, and ledger display:

- salary
- business income
- rental income
- national pension
- private pension
- additional pension
- severance
- reverse mortgage
- interest/dividend
- realized capital gain
- withdrawal principal
- one-off income
- one-off expense
- debt service
- trading cost
- medical shock
- housing cost

## Result Semantics

- `summary.retirementPoint` describes retirement-date assets
- `summary.finalTotalAssets` and terminal distribution stats describe end-of-horizon assets
- `summary.survivalStats` is calculated from depletion data even when `survivalSeries` is omitted
- representative-path consumers should default to `result.display.representative`
- sample paths should be shown as explicitly secondary scenarios, and `includeSampleTimelines=false` or `maxSampleTimelines=0` should keep `display.samples[]` empty

## Current Rulebook And Data Assumptions

- Production rulebook: `KR-2026.1`
- Historical dataset range: `1985-2024`
- Unsupported rulebooks must fail validation instead of silently falling back

## Current Residual Gaps

These are still known modeling limits even after the v3 contract cleanup:

- detailed tax-lot modeling is not implemented
- `interest_dividend` and `realized_capital_gain` are explicit fields but may remain zero when no detailed source model exists
- bucket strategy still needs deeper stateful refill semantics beyond the current canonical ledger alignment
- UI state still originates from `SimulationInput` in several places before canonical normalization
- already-running worker computations are not forcibly terminated; the current cancellation guarantee covers queued request replacement and stale response suppression

## Preferred Future Direction

- keep expanding canonical plan-first flows
- continue moving engine internals toward true ledger-native account behavior
- improve pension/tax detail without reintroducing contract ambiguity

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
