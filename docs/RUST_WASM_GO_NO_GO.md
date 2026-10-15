# Rust/WASM Go/No-Go Decision (against optimized TypeScript)

- Decision: **NO-GO (TypeScript 유지)** — 2026-10-15, 측정 근거 기반
- 기준 문서: [SIMULATION_PERFORMANCE_RESULTS.md](SIMULATION_PERFORMANCE_RESULTS.md)

## 판단 근거

최적화된 TypeScript 기준 실측(Node v24, 45→90y 현실 커널):

- Preview 80 경로: 6.5ms — 키 입력 추적에 여유 있음
- MC 1k full: 104ms — 일반 부하가 상호작용 임계(수백 ms) 이하
- MC 10k full (현재 상한): 1853ms — 배치성 전체 계산으로 허용 범위
- 장수분포 on 10k: 1786ms — 특수 분기도 상한 수준에 수렴

계획서 Phase 7의 PoC 진입 조건(UX 기준 의미 있게 초과, 수치 계산 지배,
JS 개선 불가)과 대조하면: preview/1k는 이미 충분히 빠르고, 10k는
"기다릴 수 있는 전체 계산" 성격이며 남은 시간의 지배 성분은 순수 수치 연산이
아니라 타임라인 객체 생성·집계·전송이다. WASM이 가속할 수 있는 영역이 아니다.

## 투자 게이트 대조

- 예시 게이트 "최적화 TS 대비 p95 30~40% 감소"는 Rust PoC 승인 "후"의 채택
  목표였지, 진입 조건이 아니다. 진입 조건 자체가 성립하지 않으므로 PoC 미개시.
- 부수 비용(빌드 도구·artifact·로딩·브라우저 호환·seeded RNG/부동소수점 재현성
  검증)이 확정적 도입 이익을 상회.

## 재검토 트리거 (충족 시 GO 재평가)

- 실제 사용자 환경(브라우저 worker, 저사양 기기) p95가 제품 UX 기준 초과
- 시나리오 비교·대량 batch 도입으로 처리량 부족이 실측됨
- 프로파일상 순수 수치 계산이 전체의 지배 성분으로 확인됨

그때는 본 문서의 하네스·오라클을 그대로 재사용해 Rust PoC와 TS를 동일 조건에서
비교할 것. 지금은 Rust/WASM 코드·의존성·빌드 설정을 일절 도입하지 않음.
