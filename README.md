# Retirement Sim Web

한국 가구의 은퇴 현금흐름 지속 가능성을 계산하는 React/TypeScript 기반 웹 시뮬레이터입니다. 앱 UI, 검증 메시지, 주요 내보내기 라벨은 한국어 기준으로 정리되어 있습니다.

## 현재 계약

- 런타임, Web Worker, 저장소, 내보내기는 모두 `SimulationPlanV3`를 기준으로 동작합니다.
- `SimulationPlanV2`는 과거 JSON 파일 가져오기 및 마이그레이션 용도로만 유지합니다.
- 공개 worker/client API는 plan 입력만 받습니다.
  - `requestSimulation(plan, options)`
  - `requestSimulationBatch(plans, options)`
  - `requestSolveContribution(plan, targetSuccessRate)`
  - `requestSolveLaborSavingsRate(plan, targetSuccessRate)`
  - `requestSolveRetireAge(plan, targetSuccessRate)`
- V3 핵심 필드는 실제 계산에 반영됩니다.
  - `incomeStreams[].taxable`
  - `incomeStreams[].healthInsuranceIncluded`
  - `accounts[].withdrawalPriority`
- `targetMonthlySpending`과 `retirementSpendingTarget`은 현재가치 기준 월 생활비입니다. 은퇴 이후 월별 계산에서는 CPI를 반영해 명목 생활비로 환산하고, 세금과 건강보험료는 별도 비용으로 차감합니다.
- 확률형 결과는 `summary`, `display.representative`, `display.samples[]`를 노출합니다. `summary.survivalStats`는 `includeSurvivalSeries` 옵션과 무관하게 depletion 데이터로 계산됩니다.
- `includeSampleTimelines=false` 또는 `maxSampleTimelines=0`이면 `display.samples[]`도 비워 둡니다.
- 시나리오 저장소와 플랜 JSON은 `schemaVersion: 3`을 사용합니다.
- IndexedDB 초기화/로드 실패 시 앱에서 안내를 표시하고 JSON 가져오기/내보내기 우회 경로를 제공합니다.

## 규칙과 데이터

- 지원 규칙: `KR-2026.1`
- 과거 데이터 범위: `1985-2024`
- 지원하지 않는 rulebook 조합은 검증 오류로 차단합니다. 최신 규칙으로 조용히 대체하지 않습니다.

## 주요 기능

- 결정론, Monte Carlo, 과거 경로 재현 시뮬레이션
- 월별 현금흐름 원천 추적
  - 급여, 사업소득, 임대소득
  - 국민연금, 개인연금, 추가연금
  - 퇴직금, 주택연금
  - 인출 원금, 일회성 수입/지출
  - 부채 상환, 거래비용, 의료 충격, 주거비
- 한국형 세금, 연금, 건강보험료 추정
- 대표 경로 리포트와 보조 샘플 경로 표시
- 시나리오 저장/불러오기 및 플랜 JSON 가져오기/내보내기
- 목표 생활비, 추가 납입액, 은퇴 나이 역산 도구

## 프로젝트 구조

```text
frontend/
  src/
    components/
      plan-editor/      # V3 플랜 편집 섹션
      scenario-manager/ # 저장 시나리오 preset/helper
      simple-dashboard/ # 간편 대시보드 표시 helper
    hooks/
    logic/
      engine/
        runSimulation.ts
        pathSimulation.ts
        pathReplay.ts
        pathSelection.ts
        summary.ts
      plan/              # SimulationPlanV3 스키마와 converter
      planV2/            # v2 가져오기 마이그레이션 helper
      rules/
      validation/
      simulation.worker.ts
      simulationClient.ts
      resultDisplay.ts
      export.ts
    services/
      storage.ts
```

## 개발

```bash
cd frontend
npm install
npm run dev
```

## 검증

```bash
cd frontend
npm run typecheck
npm run test -- --run
npm run build
npm run verify:ci
```

## 참고

- 일부 UI 상태는 아직 `SimulationInput`에서 시작하지만 worker/client/storage/report 경계에서는 `SimulationPlanV3`로 정규화됩니다.
- `PlanV2Editor.tsx`처럼 과거 이름을 유지한 파일이 있어도 현재 동작은 canonical v3 플랜 편집을 기준으로 합니다.
- `annualRate <= -1`, `stressTest.annualDeclineRate >= 1` 같은 비정상 연율은 blocking validation error로 처리됩니다.

## 관련 문서

- [CLAUDE.md](CLAUDE.md)
- [GEMINI.md](GEMINI.md)
- [docs/api_examples.md](docs/api_examples.md)
- [docs/modeling_notes.md](docs/modeling_notes.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/perf_automation.md](docs/perf_automation.md)
