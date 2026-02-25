# 은퇴 계산기 기능 점검 감사 보고서 (2026-02-25)

## [업데이트] 후속 구현 반영 상태 (2026-02-25)
아래 감사 이슈를 기준으로 후속 구현이 진행되었으며, 현재 코드베이스는 감사 시점 대비 다음 항목을 반영한다.

- `P0`: VPW 하한식, labor_income 전용 solver, `mc_paths` 안전장치, depletion 전체경로 집계 반영
- `P1`: guardrails/bucket UI-엔진 정합화, threshold/taxEfficient 리밸런싱 동작, 인플레이션 프리셋 반영, 결과 라벨 정합성 보강, 이벤트 누적 처리
- `P2/P3`: `tax_credit`(`law_2026`) 반영, historical source 식별(`summary.source`), historical asset mapping 우선 적용 UI, Import 마이그레이션 경로 통합
- 문서 정합성: `README.md`, `README_EN.md`, `CLAUDE.md`, `GEMINI.md`, `docs/api_examples.md`, `docs/modeling_notes.md`, `docs/roadmap.md`, `docs/perf_automation.md` 업데이트

검증 결과(후속 구현 기준):
- `npm run typecheck` 성공
- `npm run test -- --run` 성공 (`32 tests`)
- `npm run build` 성공
- `npm run perf:report` 성공 (Entry `~22.8 KiB`, Initial JS total `~233.2 KiB`)

## 1) 개요
본 문서는 `README.md`, `CLAUDE.md`, `docs/modeling_notes.md`, `docs/roadmap.md`에 명시된 기능 약속과 실제 구현(`frontend/src`)을 대조해, 은퇴 계산기 웹앱의 기능 리스크와 추가 필요사항을 정리한 감사 결과다.  
우선순위는 사용자 의사결정 왜곡 가능성 기준으로 `P0/P1`을 먼저 배치했다.

공통 이슈 기록 포맷:
- `현상`
- `영향`
- `근거 파일/라인`
- `재현 방법`
- `수정 방향`
- `검증 테스트`

Public API / Interface / Type 변경 사항:
- 이번 작업은 감사 문서 작성만 수행.
- 코드 API/타입 변경 없음.
- 변경 파일: `RETIREMENT_AUDIT_2026-02-25.md` 1개.

명시적 가정 및 기본값:
1. 범위는 오류+개선 모두 포함.
2. 우선순위는 즉시수정(`P0/P1`) 우선.
3. 저장 위치는 프로젝트 루트.
4. 문서는 재현/수정 가능한 증거 기반 형식으로 작성.
5. 이번 턴은 구현 수정 없이 감사 문서 작성만 수행.

---

## 2) 점검 방법 및 범위
대조 기준 문서:
- `README.md`
- `CLAUDE.md`
- `docs/modeling_notes.md`
- `docs/roadmap.md`
- `docs/api_examples.md`

점검 대상 코드:
- 계산 엔진: `frontend/src/logic/*`
- UI/입력/결과: `frontend/src/components/*`, `frontend/src/hooks/*`
- 저장/마이그레이션: `frontend/src/services/storage.ts`

실행 점검:
- `npm run typecheck`
- `npm run test -- --run`
- `npm run build`

---

## 3) 검증 실행 결과(typecheck/test/build)
실행 위치: `frontend`

1. `npm run typecheck`
- 결과: 성공

2. `npm run test -- --run`
- 결과: 성공
- 통과: 5 test files, 23 tests

3. `npm run build`
- 결과: 성공
- Vite production build 완료

참고:
- 실행 전 `npm ci` 필요 (`node_modules` 미설치 상태였음).

---

## 4) P0/P1 즉시 수정 이슈

### [P0-1] VPW 연간 인출변동 하한 계산식 오류
- 현상: VPW `vpwMaxYoYChange`의 하한식이 월간 최대 감소폭 의도와 다르게 계산됨.
- 영향: 인출 급감 제한이 사실상 풀려 은퇴 현금흐름이 과도하게 감소할 수 있음.
- 근거 파일/라인:
  - `frontend/src/logic/engine.ts:553`
  - `frontend/src/logic/engine.ts:558`
  - `frontend/src/logic/engine.ts:560`
  - `frontend/src/logic/engine.test.ts:266`
  - `frontend/src/logic/engine.test.ts:287`
- 재현 방법:
  1. `withdrawal.strategy = "vpw"`
  2. `vpwMaxYoYChange = 0.10`
  3. 급락 수익률 환경(예: 음수 고수익률 변동)에서 월별 인출 추이 확인
  4. 월간 하락 폭이 의도(연 10% 제한)보다 크게 발생 가능
- 수정 방향:
  - 하한식을 `lastWithdrawal * (1 - maxChangePerMonth)` 형태로 수정.
  - 기존 테스트는 현재 버그 수식을 기대하고 있으므로 함께 수정.
- 검증 테스트:
  - VPW 월간 인출이 `prev * (1 - maxChangePerMonth)` 미만으로 떨어지지 않는지 단위 테스트.

### [P0-2] Goal Solver가 `labor_income.enabled` 상황에서 월저축 역산값에 영향 없음
- 현상: Solver는 `general.monthly_contribution`만 조정하지만, 엔진은 `labor_income.enabled`면 `contributionByMonth`를 사용해 일반 월저축 값을 무시.
- 영향: 목표 역산 결과가 실제 시뮬레이션에 반영되지 않아 잘못된 의사결정 유도.
- 근거 파일/라인:
  - `frontend/src/logic/solver.ts:38`
  - `frontend/src/logic/engine.ts:300`
  - `frontend/src/logic/engine.ts:854`
  - `frontend/src/logic/engine.ts:875`
- 재현 방법:
  1. `labor_income.enabled = true`로 설정
  2. Goal Planner에서 `필요 월 저축액` 계산
  3. 결과 적용 후 성공률 변화를 비교하면 기대 대비 변화 미미/불일치
- 수정 방향:
  - Solver가 `labor_income` 기반 파라미터(저축률/소득)를 조정하는 모드 추가.
  - 또는 `labor_income.enabled`일 때 Goal Planner에서 월저축 역산 비활성/경고.
- 검증 테스트:
  - `labor_income` on/off 각각에서 solver 적용 전/후 성공률 변화가 일관되게 증가하는지 검증.

### [P0-3] `mc_paths` 음수 입력 시 런타임 크래시 가능
- 현상: 검증에서 `mc_paths` 하한 체크가 없고, 엔진에서 음수를 배열 길이에 사용 가능.
- 영향: 시뮬레이션 실행 시 예외(예: `Float64Array(-1)`)로 기능 중단.
- 근거 파일/라인:
  - `frontend/src/logic/validation.ts:3`
  - `frontend/src/logic/validation.ts:198`
  - `frontend/src/logic/engine.ts:1081`
  - `frontend/src/logic/engine.ts:1088`
  - `frontend/src/logic/engine.ts:1089`
- 재현 방법:
  1. JSON import로 `simulation_settings.mc_paths = -1` 입력
  2. 시뮬레이션 실행
  3. 워커 에러/실행 실패 확인
- 수정 방향:
  - validation에서 `mc_paths >= 1` 강제.
  - 엔진에서 `paths = Math.max(1, floor(...))` 방어 로직 추가.
- 검증 테스트:
  - `mc_paths`에 `-1`, `0`, `1`, `10000` 입력 시 정상 동작/명확 에러 메시지 확인.

### [P0-4] 리스크 대시보드 고갈분석이 샘플 경로만 사용해 통계 신뢰도 부족
- 현상: `analyzeDepletion`이 전체 경로가 아닌 `sampleTimelines`만 사용. 기본 full 옵션에서 샘플은 최대 3개.
- 영향: 고갈확률/중위 고갈연령 지표가 전체 분포를 대표하지 못해 오판 위험.
- 근거 파일/라인:
  - `frontend/src/hooks/useAutoSimulation.ts:36`
  - `frontend/src/hooks/useAutoSimulation.ts:39`
  - `frontend/src/logic/riskAnalysis.ts:13`
  - `frontend/src/logic/riskAnalysis.ts:37`
  - `frontend/src/logic/riskAnalysis.ts:59`
  - `frontend/src/components/RiskDashboard.tsx:149`
- 재현 방법:
  1. `mc_paths`를 크게 설정(예: 2000)
  2. 결과 탭의 고갈분석 확인
  3. sample path 개수(3) 기반 지표가 전체 성공률과 괴리되는 사례 확인
- 수정 방향:
  - 엔진에서 경로별 고갈 연령 집계를 별도 산출해 summary에 포함.
  - RiskDashboard는 sample이 아닌 전체 집계 사용.
- 검증 테스트:
  - 동일 seed에서 sample 기반/전체 기반 지표 차이를 비교하는 회귀 테스트.

### [P1-1] 인출 전략 UI-엔진 불일치(`guardrails`, `bucket`)
- 현상: 엔진은 `guardrails`, `bucket` 전략 로직을 갖고 있지만, 인출전략 선택 UI 목록에 두 전략이 없음.
- 영향: 문서상 지원 기능이 실제 UI로는 선택 불가.
- 근거 파일/라인:
  - `frontend/src/components/WithdrawalSettings.tsx:9`
  - `frontend/src/logic/types.ts:26`
  - `frontend/src/logic/types.ts:27`
  - `frontend/src/logic/engine.ts:566`
  - `frontend/src/logic/engine.ts:598`
  - `README.md:33`
- 재현 방법:
  1. 전문가 모드 > 인출 전략 선택 UI 진입
  2. 전략 목록에서 `guardrails`/`bucket` 선택 불가 확인
- 수정 방향:
  - `WithdrawalSettings` 전략 목록에 두 전략 추가.
  - 선택 시 필요한 필드 입력 UI(특히 bucket) 동시 노출.
- 검증 테스트:
  - UI에서 전략 전환 후 엔진 분기(`guardrails`/`bucket`)가 실제 실행되는지 E2E 검증.

### [P1-2] Bucket 설정 UI 실질 미노출
- 현상: `updateBucket` 함수는 존재하지만 실제 bucket 파라미터 입력 섹션이 없음.
- 영향: bucket 전략을 설계/튜닝할 수 없음.
- 근거 파일/라인:
  - `frontend/src/components/AdvancedSettings.tsx:74`
  - `frontend/src/components/AdvancedSettings.tsx:77`
  - `frontend/src/logic/validation.ts:74`
- 재현 방법:
  1. Advanced Settings 전체 섹션 탐색
  2. bucket 설정 필드(단기/중기 기간, 수익률 등) 부재 확인
- 수정 방향:
  - `AdvancedSettings`에 bucket 섹션 추가.
  - validation 에러와 UI 필드 연결.
- 검증 테스트:
  - bucket 필드 조정 전/후 시뮬레이션 결과가 의도대로 변하는지 회귀 테스트.

### [P1-3] 리밸런싱 `threshold`/`taxEfficient` 옵션 비동작
- 현상: UI에서 옵션 입력은 가능하나 엔진에서 실질 동작 미구현.
- 영향: 사용자에게 옵션이 동작하는 것처럼 보이지만 결과 반영이 안 됨.
- 근거 파일/라인:
  - `frontend/src/components/AdvancedSettings.tsx:486`
  - `frontend/src/components/AdvancedSettings.tsx:514`
  - `frontend/src/logic/engine.ts:992`
  - `frontend/src/logic/engine.ts:154`
  - `frontend/src/logic/engine.ts:979`
  - `README.md:43`
- 재현 방법:
  1. 리밸런싱 `frequency="threshold"` 선택 후 결과 비교
  2. `taxEfficient` on/off 비교
  3. 결과가 사실상 동일하거나 기대 동작 부재 확인
- 수정 방향:
  - threshold: 자산별 drift 추적 + 임계값 이탈 시점 리밸런싱 구현.
  - taxEfficient: 매수 우선 리밸런싱 알고리즘/turnover 계산 반영.
- 검증 테스트:
  - 동일 입력에서 `annual` vs `threshold`, `taxEfficient` on/off 결과 차이 검증.

### [P1-4] 인플레이션 프리셋(`low/normal/high/custom`) 반영 누락
- 현상: UI 프리셋은 `inflation_scenario.baseRate`를 변경하지만 엔진은 `spike`일 때만 `inflation_scenario`를 사용.
- 영향: 사용자는 프리셋 변경을 했다고 느끼지만 실제 계산은 거의 동일.
- 근거 파일/라인:
  - `frontend/src/components/AdvancedSettings.tsx:18`
  - `frontend/src/components/AdvancedSettings.tsx:22`
  - `frontend/src/logic/engine.ts:783`
  - `frontend/src/logic/engine.ts:793`
  - `frontend/src/logic/engine.ts:796`
- 재현 방법:
  1. `annual_inflation` 고정
  2. `low`/`high` 프리셋만 번갈아 선택
  3. 시뮬레이션 결과가 동일하거나 거의 동일한지 확인
- 수정 방향:
  - `spike` 외 타입에서도 `baseRate`를 우선 사용하도록 엔진 정합성 맞춤.
  - 또는 UI에서 프리셋 선택 시 `annual_inflation` 동시 업데이트.
- 검증 테스트:
  - 프리셋별 성공률/실질자산이 방향성 있게 달라지는지 회귀 테스트.

### [P1-5] 결과 카드 라벨 불일치: “은퇴 시 자산”이 실제로는 종료시점 값
- 현상: 카드 라벨은 은퇴 시점 자산인데 참조값은 `finalTotalAssetsReal`/`mc.totalAssetsReal.p50`(종료시점).
- 영향: 사용자 해석 오류(은퇴시점 vs 말기시점 자산 혼동).
- 근거 파일/라인:
  - `frontend/src/components/layout/sections/ResultsSection.tsx:95`
  - `frontend/src/components/layout/sections/ResultsSection.tsx:67`
  - `frontend/src/components/layout/sections/ResultsSection.tsx:70`
- 재현 방법:
  1. 결과 카드 “은퇴 시 자산” 확인
  2. 연도별 테이블의 은퇴 직후 자산과 비교
  3. 값이 다름을 확인
- 수정 방향:
  - 라벨을 “최종 자산(실질)”로 변경하거나,
  - 실제 은퇴월 자산을 summary에 별도 추가해 라벨과 일치시킴.
- 검증 테스트:
  - UI 카드 값과 테이블 은퇴월 값 일치 여부 테스트.

### [P1-6] 이벤트 처리 충돌: 동일 월 이벤트 덮어쓰기
- 현상: `eventsMap.set(month, amount)` 방식으로 동일 월 이벤트가 누적되지 않고 마지막 값으로 덮임.
- 영향: 복수 이벤트/반복 이벤트가 많은 시나리오에서 현금흐름 왜곡.
- 근거 파일/라인:
  - `frontend/src/logic/engine.ts:786`
  - `frontend/src/components/ExpenseManager.tsx:73`
  - `frontend/src/components/ExpenseManager.tsx:98`
  - `frontend/src/components/ExpenseManager.tsx:100`
- 재현 방법:
  1. 동일 `month_index`로 2개 이상 이벤트 입력(JSON import 또는 반복 이벤트 조합)
  2. 기대 합산값과 실제 반영값 비교
- 수정 방향:
  - `eventsMap` 구성 시 누적합(`existing + amount`) 적용.
  - ExpenseManager가 기존 이벤트를 읽어와 merge할 수 있게 개선.
- 검증 테스트:
  - 동일 월 다중 이벤트 합산 회귀 테스트.

### [P1-7] `docs/api_examples.md`와 실제 타입/워커 프로토콜 불일치
- 현상:
  - 예제 입력 스키마가 현재 `types.ts`와 다름 (`portfolio.assets`, `general.annual_return`, 루트 `retirement_monthly_spending_target`).
  - Worker 예제는 `postMessage(input)` 형태이나 현재 프로토콜은 `{requestId, kind, payload}`.
  - Solver 사용 예제의 인자 시그니처도 불일치.
- 영향: 문서대로 구현 시 컴파일/런타임 실패 가능.
- 근거 파일/라인:
  - `docs/api_examples.md:24`
  - `docs/api_examples.md:60`
  - `docs/api_examples.md:71`
  - `docs/api_examples.md:106`
  - `docs/api_examples.md:115`
  - `frontend/src/logic/types.ts:89`
  - `frontend/src/logic/types.ts:83`
  - `frontend/src/logic/workerTypes.ts:83`
  - `frontend/src/logic/simulation.worker.ts:15`
  - `frontend/src/logic/solver.ts:22`
- 재현 방법:
  1. 문서 예제 코드를 그대로 복사해 타입체크
  2. 타입/실행 에러 확인
- 수정 방향:
  - 문서 스키마를 현재 타입으로 일치 (`assetClasses`, 최신 worker request shape).
  - Solver 호출 예제 인자 수 수정.
- 검증 테스트:
  - 문서 코드 스니펫 기반 샘플 테스트(컴파일 확인) 추가.

---

## 5) P2/P3 개선 및 추가 필요사항

### [P2-1] 선언된 기능(`tax_credit`) 미구현
- 현상: 타입/검증/저장 마이그레이션에는 존재하나 엔진/화면 반영 없음.
- 영향: 사용자 기대 대비 기능 공백.
- 근거 파일/라인:
  - `frontend/src/logic/types.ts:114`
  - `frontend/src/logic/validation.ts:168`
  - `frontend/src/services/storage.ts:154`
  - `frontend/src/components/AdvancedSettings.tsx:6`
  - (`engine.ts` 내 `tax_credit` 사용 코드 없음)
- 재현 방법: 입력 JSON에 `tax_credit.enabled=true` 적용 후 결과 비교(변화 없음).
- 수정 방향: 세액공제 로직(연간 세후 현금흐름 반영) 구현 + UI 섹션 추가.
- 검증 테스트: 세액공제 on/off에서 세금/가처분소득 변화 검증.

### [P2-2] 확장 자산군(부동산/추가연금/사업소득)은 계산로직 대비 UI 입력 경로 부족
- 현상: 엔진은 처리하지만 컴포넌트에 편집 UI가 거의 없음(차트 표시 위주).
- 영향: 문서상 지원 기능의 실사용성이 낮음(JSON import 의존).
- 근거 파일/라인:
  - `README.md:23`
  - `README.md:24`
  - `README.md:25`
  - `frontend/src/logic/types.ts:130`
  - `frontend/src/logic/types.ts:131`
  - `frontend/src/logic/types.ts:132`
  - `frontend/src/logic/engine.ts:880`
  - `frontend/src/logic/engine.ts:899`
  - `frontend/src/logic/engine.ts:906`
  - `frontend/src/components/Charts/AssetBreakdownChart.tsx:33`
- 재현 방법: UI만 사용해 해당 확장 입력을 구성하려고 시도.
- 수정 방향: `RealEstateManager`, `AdditionalPensionManager`, `BusinessIncomeManager` 컴포넌트 추가.
- 검증 테스트: UI 입력만으로 확장 자산 시나리오 생성/저장/로드/E2E 검증.

### [P2-3] `historical_asset_mapping` 타입 선언 대비 미사용
- 현상: 타입에 매핑 필드가 있으나 엔진은 asset name 기반 자동 매핑만 사용.
- 영향: 사용자가 의도한 백테스트 자산 매핑 강제 불가.
- 근거 파일/라인:
  - `frontend/src/logic/types.ts:93`
  - `frontend/src/logic/engine.ts:955`
- 재현 방법: `simulation_settings.historical_asset_mapping`을 JSON에 넣어도 결과 동일.
- 수정 방향: 엔진에서 명시 매핑 우선 적용.
- 검증 테스트: 수동 매핑 반영 전/후 백테스트 결과 차이 확인.

### [P2-4] 상관계수 입력/검증 보강 필요(PSD/분산 음수 방지)
- 현상: UI는 `-1~1` 입력 허용, 엔진은 단일 `rho`로 분산 계산. 일부 조합에서 분산 음수 가능.
- 영향: `sqrt(negative)`로 NaN 전파 가능.
- 근거 파일/라인:
  - `frontend/src/components/PortfolioEditor.tsx:254`
  - `frontend/src/components/PortfolioEditor.tsx:255`
  - `frontend/src/logic/engine.ts:58`
  - `frontend/src/logic/engine.ts:93`
  - `frontend/src/logic/validation.ts:17`
- 재현 방법: 저변동/고변동 혼합 포트폴리오에서 `manualCorrelation`을 극단 음수로 설정.
- 수정 방향:
  - 허용 범위 재정의(예: `[-0.5, 1]` 등) 또는 계산 직전 분산 하한 clamp.
  - validation에 `manualCorrelation` 명시 체크 추가.
- 검증 테스트: 상관계수 극단값에서도 NaN/Infinity 비발생 테스트.

### [P2-5] ExpenseManager의 입력 이벤트 역직렬화/보존 개선 필요
- 현상: 로컬 `items`는 빈 배열로 시작하고 기존 `input.events`를 복원하지 않으며, 업데이트 시 전체 events를 교체.
- 영향: import한 이벤트/타 기능 이벤트 보존 어려움.
- 근거 파일/라인:
  - `frontend/src/components/ExpenseManager.tsx:35`
  - `frontend/src/components/ExpenseManager.tsx:37`
  - `frontend/src/components/ExpenseManager.tsx:44`
  - `frontend/src/components/ExpenseManager.tsx:98`
  - `frontend/src/components/ExpenseManager.tsx:100`
- 재현 방법: JSON import 후 ExpenseManager에서 항목 1개 추가.
- 수정 방향: 초기 hydration + source tagging + merge 정책 도입.
- 검증 테스트: import 이벤트 유지 상태에서 CRUD 회귀 테스트.

### [P3-1] Historical 모드 결과 타입 명확성 개선 여지
- 현상: historical 결과를 `mode: "montecarlo"`로 반환(호환 목적).
- 영향: 타입 해석 혼동 가능(백테스트 vs 몬테카를로).
- 근거 파일/라인:
  - `frontend/src/logic/engine.ts:999`
  - `frontend/src/logic/engine.ts:1053`
- 수정 방향: 별도 result mode 도입 또는 summary에 `source: historical` 명시.
- 검증 테스트: UI 분기에서 historical 전용 라벨/설명 정확히 노출되는지 확인.

---

## 6) README/CLAUDE 대비 구현 불일치

1. 인출 전략 지원 불일치
- 문서: Guardrails를 전략 목록으로 제시 (`README.md:33`)
- 구현: 전략 선택 UI에 guardrails/bucket 미노출 (`frontend/src/components/WithdrawalSettings.tsx:9`)

2. 자동 리밸런싱 옵션 불일치
- 문서: 세금 효율 옵션 제시 (`README.md:43`)
- 구현: threshold/taxEfficient 실동작 미구현 (`frontend/src/logic/engine.ts:992`)

3. 확장 자산/소득 실사용성 불일치
- 문서: 부동산/연금/추가소득 지원 강조 (`README.md:23`, `README.md:24`, `README.md:25`)
- 구현: 엔진 로직은 있으나 편집 UI 부족(차트 반영 중심)

4. AdvancedSettings 설명 대비 공백
- 문서/주석: Tax credit 포함으로 안내 (`frontend/src/components/AdvancedSettings.tsx:6`)
- 구현: Tax credit UI/엔진 반영 부재

5. API 예제 문서 정합성 불일치
- 문서 예제 스키마/워커 호출이 현재 타입/프로토콜과 다름 (`docs/api_examples.md:24`, `docs/api_examples.md:60`, `docs/api_examples.md:115`)

---

## 7) 테스트 공백 및 추가 테스트 시나리오

아래 8개 시나리오를 우선 추가 권장:

1. 전략별 회귀
- `safe_withdrawal_rate`, `vpw`, `guardrails`, `bucket`별 인출 흐름/세후 소득 검증.

2. 리밸런싱 모드별
- `monthly/quarterly/semi-annual/annual/threshold` 결과 차이 및 turnover/비용 반영 검증.

3. 인플레이션 프리셋
- `low/normal/high/custom/spike` 변경 시 결과 민감도 검증.

4. 역산 + labor_income
- `labor_income` on/off에서 `solveForMonthlyContribution` 유효성 비교.

5. 이벤트 누적
- 동일 `month_index` 다중 이벤트 합산 여부 검증.

6. 리스크 대시보드 정확도
- sample path 기반 지표와 전체 path 기반 지표 편차 측정.

7. 라벨 정합성
- “은퇴 시 자산” 카드와 실제 은퇴월 지표 일치 검증.

8. 경계값/안전실패
- `mc_paths <= 0`, 극단 상관계수, 음수/비정상 입력에서 차단/명확 에러 검증.

---

## 8) 권장 수정 순서(실행 플랜)

1. P0 방어패치
- `mc_paths` validation + engine clamp
- VPW 하한식 수정 및 테스트 갱신
- solver/labor_income 분기 정책 확정 및 반영

2. 분석 신뢰도 보강
- depletion 지표를 전체 경로 집계 기반으로 전환

3. UI-엔진 정합화
- guardrails/bucket 선택 UI 추가
- bucket 설정 폼 추가
- 결과 카드 라벨/지표 매핑 수정

4. 리밸런싱 실구현
- threshold 로직/turnover 계산
- taxEfficient 로직 반영

5. 인플레이션 시나리오 정합화
- non-spike 프리셋이 실제 계산에 반영되도록 통합

6. 이벤트 처리 안정화
- 동일 월 이벤트 누적
- ExpenseManager hydration/merge 개선

7. 기능 공백 해소
- tax_credit 구현
- 확장 자산(부동산/추가연금/사업소득) 입력 UI 추가
- historical_asset_mapping 적용

8. 문서/테스트 정리
- `docs/api_examples.md` 최신 타입/프로토콜로 갱신
- 상기 테스트 시나리오를 CI에 편입
