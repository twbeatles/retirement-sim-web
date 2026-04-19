# 은퇴계산기 실사용 전환 점검 보고서

작성일: 2026-04-14  
업데이트: 2026-04-19

## 요약

이 문서는 2026-04-14 시점의 실사용 준비도 점검 문서였다.  
2026-04-19 기준으로는 `SimulationPlanV3` 런타임 정렬 작업이 완료되었고, 현재 상태는 4/19 기능 구현 리뷰 문서들과 함께 읽는 것이 가장 정확하다.

## 2026-04-14 당시 핵심 판단

- 내부 데모/개인 실험용 기반은 충분했다.
- 실사용 서비스 기준으로는 세금/건보/현금흐름/결과 라벨 정합성 보강이 필요했다.
- plan 모델과 실제 엔진 경로가 완전히 일치하지 않았다.

## 2026-04-19 반영 상태

다음 항목은 이후 구현에서 실제로 정리되었다.

- `SimulationPlanV3`를 canonical runtime/storage/export contract로 승격
- worker/client API를 plan-only 계약으로 정리
- `schemaVersion: 3` 저장 포맷 적용
- representative path와 labeled sample paths 분리
- rulebook resolver를 실제 계산 기준으로 적용
- canonical plan validation 추가
- IndexedDB reset notice 및 JSON 재수입 흐름 추가
- README / CLAUDE / API examples / modeling notes 동기화

## 아직 남아 있는 후속 과제

- 더 정교한 계좌 단위 tax-lot 모델
- bucket 전략의 실잔고/리필 규칙 고도화
- UI 상태의 직접적인 canonical plan 관리 확대
- 더 넓은 E2E / golden scenario coverage

## 현재 참조 우선순위

현재 상태를 파악할 때는 아래 문서를 우선 참고한다.

1. `README.md`
2. `CLAUDE.md`
3. `docs/api_examples.md`
4. `docs/modeling_notes.md`
5. `docs/functional_implementation_review_2026-04-19.md`
6. `docs/functional_implementation_review_addendum_2026-04-19.md`
