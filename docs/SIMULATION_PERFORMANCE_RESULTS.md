# Simulation Performance Results (optimized TypeScript vs baseline)

- Baseline: [SIMULATION_PERFORMANCE_BASELINE.md](SIMULATION_PERFORMANCE_BASELINE.md)
  (HEAD `e5cfc55`, Node v24.20.0, Windows 11, 동일 기기·동일 seed로 재측정)
- After: 본 문서와 함께 커밋·푸시된 `main` HEAD (아래 "변경 파일" 참조,
  정확한 SHA는 푸시 보고에 기록)
- 측정 명령: `PERF_BENCH=1 PERF_FULL=1 npx vitest run
  src/logic/perf/simulationBenchmark.test.ts` (warmup 후 반복, median/p95 보고)
- Parity: golden 5건 + 전체 108 tests PASS (출력 bit-identical)

## 변경 파일

- `frontend/src/logic/math.ts` — Mulberry32 상태를 명시적 모듈 값으로 전환
  (수열 bit-identical) + `snapshotRngState`/`restoreRngState` +
  `randomNormalTypedArray` 추가 (기존 `randomNormalArray`는 wrapper로 유지)
- `frontend/src/logic/engine/pathReplay.ts` — `simulateMonteCarloPathOnce`
  단일 경로 러너 추출, 체크포인트 직접 replay + legacy fallback
- `frontend/src/logic/engine/runSimulation.ts` — full MC 루프에서 경로별 RNG
  체크포인트 캡처, 대표/샘플 replay에 전달, 분위수 정렬 기본값화
- `frontend/src/logic/engine/summary.ts` — 생존율 집계를 histogram+prefix-sum으로
  선형화 (출력 shape·semantics 보존)
- `frontend/src/logic/engine/pathReturns.ts` — typed-array 직접 반환
  (반환 타입 `number[] | Float64Array` → `Float64Array`로 축소)
- `frontend/src/logic/perf/` — 벤치마크 하네스 + golden fixture (신규)
- `docs/` — 본 문서 포함 4종 (신규)

## 시나리오별 before/after (median·p95, 동일 seed)

| 시나리오 | Before median | Before p95 | After median | After p95 | 상대 개선 | parity | 상태 |
|---|---:|---:|---:|---:|---:|---|---|
| preview 80 | 8.1ms | 11.8ms | 6.5ms | 8.0ms | 약 20% | PASS | 완료 |
| MC 100 full | 22.8ms | 34.2ms | 14.3ms | 19.3ms | 약 37% | PASS | 완료 |
| MC 1000 full | 374.0ms | 392.7ms | 104.3ms | 105.8ms | 약 72% | PASS | 완료 |
| MC 10000 full | 2748.7ms | 2848.4ms | 1852.5ms | 1886.7ms | 약 33% | PASS | 완료 |
| MC 10000 no samples | 4242.5ms | 4487.0ms | 1960.2ms | 2093.0ms | 약 54% | PASS | 완료 |
| MC 10000 traj off | 3294.4ms | 3500.6ms | 1218.0ms | 1388.0ms | 약 63% | PASS | 완료 |
| MC 10000 longevity | 4842.8ms | 4994.4ms | 1785.5ms | 1851.1ms | 약 63% | PASS | 완료 |
| historical full | 7.8ms | 9.2ms | 11.7ms | 15.3ms | 노이즈 | PASS | min 동일(7.3→7.1ms), 절댓값 4ms 노이즈로 판단 |
| deterministic | 0.1ms | 0.4ms | 0.1ms | 0.2ms | — | PASS | 완료 |

메모리는 heap delta GC 노이즈가 지배적이라 정량 비교 불가 (NOT_VERIFIED).
단, 10k 경로당 `Float64Array(720)` 임시 복사 10k건 제거는 확정적 할당 감소.

## 가장 큰 병목과 해결 기여

1. Legacy replay (Phase 1): 대표+샘플 최대 4회가 각자 `0..targetIndex`를
   재실행 → 10k 상한에서 수 초의 index lottery. 체크포인트 직접 replay로
   각 1회 실행으로 축소. M-3 72% 개선의 대부분이 이것.
2. 분위수 정렬 (Phase 2): 월 540회 × comparator 콜백 → 기본 숫자 정렬로 약 2배.
3. 생존율 집계 (Phase 3): 50–100배 micro 개선, end-to-end 수십 ms 기여.
4. Phase 4는 격리 micro에서 wall-clock 이득 없음. 할당/GC·타입 단순화 목적이며
   회귀 없음이 입증되어 유지. 단독 수치 기여를 주장하지 않음.
5. Phase 5 (`pathSelection` 선형 스캔)는 병목 근거 없어 미수행.

## 동작상 변경 사항

없음. 공개 계약·의미론·seed 재현성 모두 보존, golden strict parity PASS.
유일한 관측 가능 차이는 wall-clock 단축과 `createMonthlyGeneralReturns`의
반환 타입 축소(내부 함수, 외부 import 없음 확인).
