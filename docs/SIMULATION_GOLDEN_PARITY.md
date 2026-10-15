# Simulation Golden Parity (Phase 0 oracle, Phase 1-4 gate)

- Oracle: `frontend/src/logic/perf/__fixtures__/simulation-golden.json`
- Harness: `frontend/src/logic/perf/simulationBenchmark.test.ts`
- Generated from the UNMODIFIED engine at HEAD `e5cfc55` (2026-10-15), never
  regenerated since. All optimization phases passed strict parity against it.

## What is pinned

| 케이스 | 내용 | 고정 방식 |
|---|---|---|
| G-1 deterministic | 60→70y 단일 경로 | summary/trajectory/survival 전체 `toEqual` + timeline digest + key rows |
| G-2 mc32 seed 20260222 | 45→90y 현실 커널 | 위 + 대표/샘플 pathIndex·timeline digest |
| G-3 mc32 seed 0 | seed falsy 취급 방지 | 위와 동일 |
| G-4 preview 80 | preview 모드, cap 80 | pathCount·summary·display digest |
| G-5 mc32 no-samples | `includeSampleTimelines=false, maxSampleTimelines=0` | 샘플 비어 있음 + 대표 유지 확인 |

`summary`, `trajectoryStats`, `survivalSeries`는 전체 객체 엄격 비교.
타임라인 계열은 FNV-1a digest + 첫/중간/마지막 행 금액 6종 exact 비교.
입력 hash·seed·mode·pathCount도 함께 고정.

## Independent checks (oracle 밖에 둔 검증)

- 결정론 복리: 기존 `engine.test.ts`의 closed-form 테스트가 통과
  (최적화와 무관한 수작업 식).
- Replay 동등성: `replayMonteCarloPath(k) == sampleTimelines[k]` (k=0,1,2)
  — capture가 RNG를 소비하지 않는다는 Phase 1 전제를 증명.
- Seed 0 재현성: 동일 seed 2회 실행 digest 일치, seed 0 유효.
- Phase 1: seed 0/1/20260222/2147483647 × 인덱스 0/1/mid/last × 장수 on/off에서
  checkpoint replay == legacy replay (`toEqual`).
- RNG 리팩터링 충실도: `setSeed` 동일 스트림, snapshot/restore 후 50개열 재현.
- 미검증: 브라우저 worker 실측, 저사양 모바일, 메모리 상한 환경 (NOT_VERIFIED).

## Mutation evidence (manual, 2026-10-15)

- 체크포인트를 경로 실행 "이후"에 저장하도록 교란 → golden 3건 실패로 탐지됨.
  탐지 후 원복하고 전체 스위트 재통과 확인.
- 소진월 `<=` 교란은 integer 계약상 동등 변이(equivalent mutant)라 제외.
- 자동 mutation 도구 미설치 → 수동 변이 1건 + 사유 기록 (도구 기반은 NOT_VERIFIED).
