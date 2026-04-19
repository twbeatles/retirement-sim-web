# 기능 구현 점검 리뷰 Addendum

작성일: 2026-04-19  
업데이트: 2026-04-19 implementation status sync

## 목적

본 addendum은 4/19 기능 구현 리뷰 이후 추가로 확인한 문서/계약/UI 경계 정합성 이슈와, 해당 항목의 실제 반영 상태를 보완 기록한다.

## 반영 완료된 항목

- README / CLAUDE / API examples / modeling notes 계약 동기화
- plan-only worker/client 테스트 갱신
- canonical plan validation 테스트 추가
- storage reset notice 테스트 추가
- representative-path 기본 소비 흐름 정리

## 여전히 기억해야 할 점

### 문서상의 “legacy compatibility” 표현

다음 표현은 현재 문서에서 제한적으로만 남아 있어야 한다.

- `SimulationPlanV2`
- `legacy input`
- `plan_v2`

현재 기준:

- import migration 설명에서는 허용
- runtime/storage/export/public API 설명에서는 비허용

### 파일명과 실제 계약의 차이

예:

- `PlanV2Editor.tsx`

현재 이 컴포넌트는 파일명과 달리 canonical v3 plan을 편집한다.

의미:

- 코드 검색 시 오해 가능성이 있으므로, 차후 파일명 정리 리팩터링 후보로 유지한다.

### IndexedDB reset UX

현재는 schema cut 시 notice를 남기고 reset/re-import를 안내한다.

남은 과제:

- 더 명시적인 reset history UI
- scenario backup education copy

## 권장 운영 원칙

1. 새 기능 설명은 항상 `SimulationPlanV3` 계약 기준으로 작성한다.
2. 결과 설명은 representative path와 sample paths를 구분해서 쓴다.
3. 규칙 설명은 “resolved rulebook” 관점으로 쓴다.
4. old plan / legacy input 언급은 migration 섹션으로 한정한다.
