# 기능 구현 점검 보고서 (2026-03-01)

## 1) 점검 범위
- 참조 문서: `README.md`, `CLAUDE.md`
- 점검 대상: `frontend/src` 전체(특히 `logic`, `hooks`, `components/layout/sections`)
- 실행 검증:
  - `npm run verify:pr` 통과
  - `npm run test -- --run` 통과 (6 files, 32 tests)

## 2) 요약
- 빌드/타입/기본 테스트는 모두 통과했지만, 실제 런타임 경계값/기능 반영 측면에서 **즉시 보완이 필요한 문제(P0~P1)** 가 확인됨.
- 특히 입력 검증과 엔진 방어 로직 사이 불일치로 인해, UI에서 경고만 표시되고 실제 계산이 크래시 나는 케이스가 재현됨.

---

## 3) 우선순위별 상세 이슈

### [P0] 잘못된 나이 입력 시 런타임 크래시 (TypedArray 길이 음수)
- 상태: **재현됨**
- 근거:
  - 기본 입력 UI는 연령값을 제한하지 않음: `frontend/src/components/layout/sections/BasicSection.tsx:16`, `:17`, `:18`
  - 자동 시뮬레이션은 검증 에러가 있어도 계속 실행: `frontend/src/App.tsx:80`
  - 엔진은 `totalMonths` 음수 가능 상태에서 TypedArray를 생성: `frontend/src/logic/engine.ts:1059`, `:1064`
- 재현 결과:
  - `current_age=60`, `end_age=55`로 실행 시 `Invalid typed array length: -60` 에러 발생 확인
- 영향:
  - 입력 중 특정 값 조합에서 워커 실패/결과 미출력 발생 가능
- 권장 조치:
  - `runSimulation` 초입에 `totalMonths <= 0` 방어 분기(친화적 에러 반환 또는 안전한 빈 결과 반환)
  - 연령 입력 UI에 최소/최대/상호제약(`current < retire < end`) 적용
  - `validation` 에러 존재 시 자동 실행 차단 또는 디바운스 중단

### [P0] 건강보험 상세 모드 `isDependent`(피부양자) 옵션이 엔진에서 무시됨
- 상태: **재현됨**
- 근거:
  - UI 설명: “피부양자 자격 유지 (보험료 0원)”: `frontend/src/components/AdvancedSettings.tsx:234`
  - 엔진 계산 분기에서 `hi.isDependent` 체크 없음: `frontend/src/logic/engine.ts:860`~`:899`
- 재현 결과:
  - 동일 입력에서 `isDependent=true/false` 비교 시 최종 실질자산 값이 동일
- 영향:
  - 사용자 기대(0원 처리)와 실제 계산 불일치
- 권장 조치:
  - 상세 모드에서 `isDependent === true`면 `healthInsurancePremium = 0` 강제
  - 회귀 테스트 추가(동일 입력에서 dependent true가 false 대비 유리해야 함)

### [P1] 의료비 쇼크가 같은 월에 여러 건 있으면 누적되지 않고 마지막 값만 반영됨
- 상태: **재현됨**
- 근거:
  - 맵 구성 시 overwrite: `frontend/src/logic/engine.ts:1091`
- 재현 결과:
  - `1,000,000` + `2,000,000` 동월 입력 결과가 `2,000,000` 단일 입력 결과와 동일
- 영향:
  - 다중 의료비 이벤트 시 자산 고갈 리스크 과소평가 가능
- 권장 조치:
  - `medicalShockMonths.set(month, existing + amount)` 누적 처리로 수정
  - 동일 연령(또는 동일 month) 다중 이벤트 테스트 추가

### [P1] 민감도 분석의 `annual_inflation`이 실질적으로 동작하지 않음
- 상태: **재현됨**
- 근거:
  - 민감도 분석은 `annual_inflation`만 변경: `frontend/src/logic/riskAnalysis.ts:124`~`:126`
  - 엔진은 `inflation_scenario.baseRate`를 우선 사용: `frontend/src/logic/engine.ts:1046`~`:1050`
- 재현 결과:
  - 동일 입력에서 `annual_inflation` 변화를 줘도 민감도 결과가 전 구간 동일
  - 같은 케이스에서 `annual_return` 변화는 정상적으로 민감도 변화 발생
- 영향:
  - “물가 민감도” 차트가 사실상 무의미해질 수 있음
- 권장 조치:
  - 민감도 분석에서 `inflation_scenario.baseRate`도 함께 변경
  - 또는 엔진 우선순위를 `annual_inflation` 중심으로 일원화(정책 결정 필요)

### [P2] 자산 섹션 UI가 엔진 입력 파라미터를 충분히 노출하지 못함
- 상태: **확인됨**
- 근거:
  - 부동산: `growthRate`, `rentalYield`, `managementCost`, `type`는 추가 시 기본값만 들어가고 편집 UI 없음 (`frontend/src/components/layout/sections/AssetsSection.tsx:95`~`:99`)
  - 추가연금: `type`, `monthlyContribution`, `expectedReturn`, `payoutType`, `monthlyPayout` 등 고급 필드 편집 UI 부재 (`AssetsSection.tsx:162`~`:167`)
  - 사업소득: `growthRate`, `endAge` 입력 UI 부재 (`AssetsSection.tsx:232`, `:234`)
- 영향:
  - 문서상 지원 기능 대비 실제 조정 가능 범위 제한
  - 고급 케이스는 JSON import 의존도 증가
- 권장 조치:
  - 각 자산 타입별 상세 에디터 필드 추가
  - 최소한 핵심 파라미터(성장률, 종료나이, 수령방식)는 UI에서 편집 가능하도록 확장

### [P2] 역사 시나리오 메타데이터가 2곳에 중복 정의되어 드리프트 위험
- 상태: **확인됨**
- 근거:
  - `frontend/src/logic/historicalData.ts:130`
  - `frontend/src/logic/historicalScenarioMeta.ts:13`
- 영향:
  - 설명/레이블 변경 시 한쪽만 수정되는 문서-코드 불일치 리스크
- 권장 조치:
  - 단일 소스(`historicalScenarioMeta.ts`)로 통합 후 `historicalData.ts`에서는 import 사용

---

## 4) 추가 구현 권장 (테스트/안정성)

1. 엔진 방어 테스트 추가
- `end_age <= current_age`, `retire_age <= current_age` 입력에서 크래시 없이 처리되는지 검증

2. 기능-UI 정합 테스트 추가
- `health_insurance.isDependent=true` 시 보험료 0 처리
- 의료비 쇼크 동월 다중건 누적
- 민감도 `annual_inflation` 결과가 실제로 변하는지

3. 입력 에러 실행 정책 명확화
- `validation`의 `severity=error` 존재 시 자동 시뮬레이션을 멈출지 정책 결정 필요

---

## 5) 권장 우선 처리 순서
1. P0 2건(입력 크래시, 피부양자 무시) 즉시 수정
2. P1 2건(의료비 누적, 물가 민감도) 수정 + 회귀 테스트 추가
3. P2(자산 UI 확장, 역사 시나리오 메타 통합) 순차 개선

---

## 6) Implementation Status Update (2026-03-01)

All planned items in this review are now implemented.

### Completed
- [x] P0-1 Input crash prevention and auto-simulation gating
- [x] P0-2 Health insurance `isDependent` behavior in detailed mode
- [x] P1-1 Medical shock same-month accumulation
- [x] P1-2 Inflation sensitivity synchronization with `inflation_scenario.baseRate`
- [x] P2-1 Asset section core field expansion
- [x] P2-2 Historical scenario metadata single-source cleanup

### Added tests
- [x] `engine.test.ts`
  - invalid age relationship throws
  - dependent vs non-dependent health insurance behavior
  - same-month medical shock accumulation
- [x] `riskAnalysis.test.ts`
  - inflation sensitivity produces non-flat success-rate curve
- [x] `useAutoSimulation.test.tsx`
  - no simulation call while blocking validation error exists
  - simulation resumes after error is cleared

### Verification (executed on 2026-03-01)
- [x] `npm run typecheck`
- [x] `npm run test -- --run` (8 files, 38 tests)
- [x] `npm run verify:pr`
