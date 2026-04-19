# 기능 구현 점검 리뷰

작성일: 2026-04-19  
업데이트: 2026-04-19 implementation status sync

## 목적

`SimulationPlanV3` 전환 전후 기준에서 기능 구현의 잠재 리스크와 필요한 구조 수정을 점검하고, 이후 실제 코드 반영 상태까지 함께 남기는 문서다.

## 2026-04-19 구현 반영 요약

다음 항목은 현재 코드에 반영되었다.

- `SimulationPlanV3` canonical plan 계약 도입
- plan-only worker/client API 정리
- rulebook resolver 기반 계산 정렬
- 대표 경로와 샘플 경로 분리
- 결과 소비 레이어의 representative-path 우선 사용
- `schemaVersion: 3` 저장/내보내기 적용
- IndexedDB reset notice 및 JSON 재수입 안내 흐름
- canonical plan validation 추가

## 구현적으로 확인된 핵심 리스크

### 1. UI 상태는 아직 일부 구간에서 `SimulationInput`부터 시작한다

- worker/client/storage/export 경계는 v3 plan으로 정리되었지만
- 일부 UI state와 편집 흐름은 legacy-first normalization을 거친다

영향:

- 구조적으로는 안정화되었지만, 장기적으로는 direct-plan state 관리가 더 명확하다.

### 2. 투자계좌 세부 소득 분해는 아직 제한적이다

- `interest_dividend`
- `realized_capital_gain`

이 두 필드는 canonical source map에 포함되어 있지만, 세목/lot 수준 모델은 아직 없다.

영향:

- 보고서/세금/건보 입력 필드 구조는 준비되었지만, 모델링 정밀도는 후속 작업이 필요하다.

### 3. bucket 전략은 완전한 자산 버킷 시뮬레이터로 끝나지 않았다

- result/display, source map, withdrawal priority, trading cost는 정리되었지만
- short/mid/long bucket refill semantics는 추가 고도화 여지가 있다

## 현재 기준 권장 해석

- 이 프로젝트는 더 이상 “plan v2 중심 런타임”이 아니다.
- 현재 정식 계약은 `SimulationPlanV3`와 representative-path 기반 결과 소비다.
- `SimulationPlanV2`는 import migration 문맥에서만 다루는 것이 맞다.

## 후속 우선순위

1. UI state direct-plan 관리 확대
2. 투자계좌 세목 분해 고도화
3. bucket 리필/소진 규칙 정교화
4. report/export 중심 E2E 고정 시나리오 보강
