# Project Audit

## 1. Executive Summary

2026-06-11 기준 감사 개선 구현과 광범위 코드 분할 리팩토링을 완료했습니다. 기존 확정 이슈 7개는 validation, storage, worker/client, UI error state, JSON import 방어선으로 반영되었고, 이후 긴 코드 파일 일부를 기능 단위 모듈로 분리했습니다.

현재 위험도는 **Low-Medium**입니다. 주요 public facade는 유지했으며, `typecheck`와 전체 unit test는 리팩토링 중 각 배치 후 통과했습니다. 남은 watch item은 `pathSimulation.ts`, `planV2/converters.ts`, 일부 대형 UI 파일의 추가 세분화와 in-flight worker 강제 취소 정책입니다.

## 2. Project Understanding

이 프로젝트는 한국 가구의 은퇴 현금흐름 지속 가능성을 계산하는 React/TypeScript 웹 시뮬레이터입니다. canonical runtime/storage/export 타입은 `SimulationPlanV3`이고, `SimulationPlanV2`는 JSON import migration 용도로 유지됩니다.

현재 구조는 다음 기준으로 정리되어 있습니다.

- `logic/types.ts`: 기존 import 경로를 유지하는 public type facade
- `logic/featureTypes.ts`: Phase 1-7 확장 기능 타입
- `logic/validation/*`: V3 shape, enum, runtime policy helper와 validation facade
- `logic/engine/*`: mode guard, run config, path returns, distribution stats, path replay/selection
- `components/scenario-manager/*`: JSON import/export, storage notice, preset/list 표시 분리
- `components/scenario-comparison/*`: comparison data helper, selector, chart/table 표시 분리
- `components/risk-dashboard/*`: risk dashboard tab panel 분리
- `components/what-if/*`: slider config/tone helper 분리
- `components/income-manager/*`: labor income parsing/chart helper 분리
- `components/simple-dashboard/*`: guided dashboard metrics/helper 분리

CodeGraph 분석 기준 `simulateOnePath`, `validatePlanV3`, `ScenarioManager`, `ResultsSection`은 public facade를 유지하는 방식이 호출부 영향이 가장 작았습니다. 이번 리팩토링도 해당 facade를 유지하는 방향으로 수행했습니다.

## 3. High-Risk Issues

### 1. 외부/저장 plan의 시뮬레이션 모드 enum 검증 부족

* 위치: validation, engine mode guard
* 문제: invalid mode가 deterministic fallback으로 실행될 수 있었습니다.
* 영향: JSON import 또는 손상 저장 데이터가 잘못된 결과를 정상 결과처럼 표시할 수 있었습니다.
* 근거: 기존 runtime validator와 engine branch가 TypeScript union에 의존했습니다.
* 권장 수정 방향: 구현 완료. validation/runtime policy와 engine guard에서 unknown mode를 차단합니다.
* 우선순위: High

### 2. Monte Carlo 경로 수 blocking 상한 부재

* 위치: `runtimeLimits.ts`, validation, engine, UI input
* 문제: 매우 큰 path count가 worker 메모리와 브라우저 응답성을 위협할 수 있었습니다.
* 영향: 대형 typed array 할당과 장시간 계산으로 탭 정지 또는 worker 장애가 가능했습니다.
* 근거: 기존 validation은 일부 warning에 그쳤고 engine은 값을 그대로 사용했습니다.
* 권장 수정 방향: 구현 완료. `MAX_FULL_MONTE_CARLO_PATHS = 10_000`을 UI/validation/engine에 적용했습니다.
* 우선순위: High

### 3. JSON 가져오기 파일 크기/읽기 오류 처리 부족

* 위치: `components/scenario-manager/fileExchange.ts`
* 문제: 대형 파일 preflight와 FileReader error/abort 처리가 없었습니다.
* 영향: 잘못된 파일 선택 시 UI 정지 또는 부정확한 안내가 가능했습니다.
* 근거: 기존 import flow는 `onload`와 `JSON.parse()` 중심이었습니다.
* 권장 수정 방향: 구현 완료. 1MB 이하 UTF-8 V2/V3 envelope만 허용하고 오류 메시지를 분리했습니다.
* 우선순위: High

### 4. requestSimulation coalescing의 오래된 Promise resolve 문제

* 위치: `simulationClient.ts`, hooks, what-if helper
* 문제: queued payload가 교체될 때 이전 caller가 최신 payload 결과로 resolve될 수 있었습니다.
* 영향: 직접 API caller가 요청과 응답의 1:1 대응을 오인할 수 있었습니다.
* 근거: 기존 queued consumer list에 이전 caller와 최신 caller가 함께 남았습니다.
* 권장 수정 방향: 구현 완료. 교체된 queued consumer는 `AbortError`로 reject하고 UI는 조용한 취소로 처리합니다.
* 우선순위: Medium

### 5. IndexedDB blocked/versionchange 및 localStorage 실패 방어 부족

* 위치: `storage.ts`, `ScenarioManager`
* 문제: localStorage reset notice 실패가 upgrade 흐름에 영향을 줄 수 있고 blocked/versionchange 처리가 없었습니다.
* 영향: 다른 탭 또는 privacy 설정 환경에서 저장소 초기화가 불명확하게 멈출 수 있었습니다.
* 근거: 기존 init flow는 `onerror`, `onsuccess`, `onupgradeneeded` 중심이었습니다.
* 권장 수정 방향: 구현 완료. localStorage 접근을 best-effort로 감싸고 `onblocked`, `db.onversionchange` 처리를 추가했습니다.
* 우선순위: Medium

### 6. V3 plan ID 중복과 구조적 schema 검증 부족

* 위치: `validation/planV3Shape.ts`, `validation/planV3Enums.ts`, `planValidationV3.ts`, `storage.ts`
* 문제: 중복 ID, 주요 enum, 필수 구조, 대형 배열 검증이 약했습니다.
* 영향: import/storage 손상 데이터가 전체 시나리오 목록 로드 실패나 모호한 참조로 이어질 수 있었습니다.
* 근거: 기존 validator는 정상 shape를 전제로 순회하는 구간이 있었습니다.
* 권장 수정 방향: 구현 완료. schema guard, enum 검증, duplicate ID 검증, 배열 크기 검증을 추가했습니다.
* 우선순위: Medium

### 7. Pro 분석 기능 실패의 사용자 표시 부족

* 위치: `RiskDashboard`, `ScenarioComparison`
* 문제: 민감도 분석과 시나리오 비교 실패가 console error에만 남았습니다.
* 영향: 사용자에게 실패 원인과 재시도 가능성이 표시되지 않았습니다.
* 근거: 기존 catch block은 화면 error state를 갱신하지 않았습니다.
* 권장 수정 방향: 구현 완료. 사용자 표시용 error state와 재시도 안내 메시지를 추가했습니다.
* 우선순위: Low

## 4. Potential Functional Gaps

- **구현 완료:** 저장 시나리오 이름 중복은 overwrite confirm 후 `updateScenario()`를 사용합니다.
- **구현 완료:** JSON import/export 안내는 UTF-8 JSON, V2/V3 envelope, 1MB 제한, 복구 경로를 명시합니다.
- **구현 완료:** 외부 JSON의 대형 주요 배열은 500개 상한으로 blocking validation합니다.
- **부분 구현 / watch item:** worker 요청 취소는 queued 교체 `AbortError`까지 구현했습니다. 이미 실행 중인 worker 계산 강제 중단/timeout은 별도 변경으로 남았습니다.
- **watch item:** storage reset 전 자동 JSON backup/export prompt는 아직 없습니다.

## 5. Recommended Fix Plan

### 1단계: 즉시 수정해야 할 문제

완료되었습니다. mode/path/seed/enum validation, Monte Carlo 상한, engine fallback 제거, JSON import 방어선을 반영했습니다.

### 2단계: 안정성 개선

완료되었습니다. coalescing `AbortError`, IndexedDB blocked/versionchange, localStorage try/catch, 손상 record skip/count, Pro 분석 error state를 반영했습니다.

### 3단계: 구조 개선

진행 완료된 분리:

1. `ScenarioManager`를 file exchange, storage messages, preset list, saved scenario list, file controls로 분리했습니다.
2. `ScenarioComparison`을 data helper, selector, results chart/table로 분리했습니다.
3. `RiskDashboard`를 탭 panel 단위로 분리했습니다.
4. `WhatIfSlider` 설정과 tone helper를 분리했습니다.
5. `ResultsSection`의 result/ledger derivation helper를 분리했습니다.
6. V3 validation shape/enum/runtime policy helper를 분리했습니다.
7. engine mode guard, run config, path returns, distribution stats helper를 분리했습니다.
8. `SimpleDashboard`, `AssetsSection`, `IncomeManager`의 계산/파싱 helper를 분리했습니다.
9. 확장 타입을 `featureTypes.ts`로 분리하고 `types.ts` facade를 유지했습니다.

남은 구조 개선 후보:

- `pathSimulation.ts`의 월별 ledger/tax/withdrawal state mutation 추가 분리
- `planV2/converters.ts` migration helper 세분화
- `SimpleDashboard`, `AssetsSection`, `IncomeManager`의 presentational subsection 추가 분리

## 6. Test Recommendations

현재 보강된 테스트:

- validation: invalid mode, path cap, seed, duplicate IDs, malformed V3 plan
- engine: unknown mode throw, Monte Carlo cap, historical/Monte Carlo/deterministic parity
- simulation client: queued replacement `AbortError`
- storage: localStorage throw, blocked/versionchange, corrupt record skip/count
- ScenarioManager: oversized JSON, FileReader error, invalid schema, duplicate overwrite
- RiskDashboard/ScenarioComparison: 실패 시 화면 오류 메시지

리팩토링 후 최종 검증 결과:

```bash
cd frontend && npm run lint                 # passed
cd frontend && npm run check:duplicates     # passed
cd frontend && npm run typecheck            # passed
cd frontend && npm run check:imports        # passed
cd frontend && npm run test -- --run        # passed, 16 files / 82 tests
cd frontend && npm run build                # passed
cd frontend && npm run verify:ci            # passed, includes perf:gate:hard
git diff --check                            # passed
```
