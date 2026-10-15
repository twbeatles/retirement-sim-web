# Simulation Performance Baseline (Phase 0, pre-optimization)

- Date: 2026-10-15 (UTC+9, Asia/Seoul presumed; vitest wall-clock on this machine)
- Git HEAD (pre-change): `e5cfc55e3d322d8736b1ced92922b0edc372442c` (branch `main`)
- Dirty tree at baseline: `CLAUDE.md`, `GEMINI.md` (+49 lines each, Spec Kit guide appends — docs only, no engine impact)
- Harness: `frontend/src/logic/perf/simulationBenchmark.test.ts`
  (`PERF_BENCH=1` prints timings, `PERF_FULL=1` enables the heavy matrix)
- Golden oracle: `frontend/src/logic/perf/__fixtures__/simulation-golden.json`
  (cases G-1..G-5, generated from the unmodified engine, strict `toEqual`/digest parity)
- Gates at baseline: `typecheck` PASS, `test -- --run` 17 files / 87 tests PASS
- Environment: Windows 11 Pro, AMD64 Family 25 Model 117, 14 GB RAM,
  Node.js v24.20.0, npm 12.2.0. Node worker numbers below are NOT browser numbers.
- Common input: realistic 45→90y kernel (540 months, 2-asset portfolio, debt,
  pensions, events, tax/insurance); seeds fixed per scenario (see harness).

## End-to-end baseline (median of repeats, after warmup)

| 시나리오 | median | p95 | min | max | 비고 |
|---|---:|---:|---:|---|---|
| D-1 deterministic 1 path | 0.1ms | 0.4ms | 0.1ms | 0.4ms | 초기화 비용 수준 |
| H-1 historical full | 7.8ms | 9.2ms | 7.3ms | 9.2ms | 과거 시나리오 분기 |
| M-1 preview 80 | 8.1ms | 11.8ms | 6.7ms | 11.8ms | 키 입력 미리보기 |
| M-2 MC 100 full | 22.8ms | 34.2ms | 21.0ms | 34.2ms | 소규모 |
| M-3 MC 1000 full | 374.0ms | 392.7ms | 299.8ms | 392.7ms | 일반 부하 |
| M-4 MC 5000 full | 1580.3ms | 1642.2ms | 1370.0ms | 1642.2ms | 고부하 |
| M-5 MC 10000 full | 2748.7ms | 2848.4ms | 2735.0ms | 2848.4ms | 상한, 대표+샘플 3 replay 포함 |
| M-6 MC 10000 no samples | 4242.5ms | 4487.0ms | 3944.3ms | 4487.0ms | 대표 replay 1회, seed 16 |
| M-7 MC 10000 traj off | 3294.4ms | 3500.6ms | 3290.2ms | 3500.6ms | 분위수/생존 집계 off, seed 17 |
| M-8 MC 10000 longevity on | 4842.8ms | 4994.4ms | 4665.8ms | 4994.4ms | 장수분포 on, seed 18 |

Heap deltas were GC-noise dominated (including negative values); treat as
order-of-magnitude only. Memory instrumentation beyond heap delta: NOT_VERIFIED.

## Anomaly notes (baseline)

- M-6/M-7 slower than M-5 despite doing less aggregate work. Root cause:
  legacy `replayMonteCarloPath` re-runs paths `0..targetIndex`, so total time
  depends on the randomly selected representative/sample indices
  (seed 15/16/17 → different indices). Replay cost is an index lottery:
  replaying the last path of a 1000-path run costs 135.4ms median against a
  400.7ms full run. This confirms the Phase 1 premise and means before/after
  comparisons must use identical seeds (identical selected indices).
- M-8 (longevity) is the slowest: variable path lengths do not reduce the
  per-month work enough to offset the extra RNG draw and padding, plus its own
  replay lottery draw.

## Micro findings (baseline, parity proven in-harness)

- `Float64Array.sort()` default vs `(a,b)=>a-b` on 10k simulation-like values:
  0.5ms vs 1.1ms median (~2x). Outputs differ ONLY by -0/+0 placement
  (1482 zero-sign positions in an adversarial synthetic mix); all p10/p25/p50/
  p75/p90 consumer outputs numerically identical. Real trajectory values cannot
  be -0 (balances pass through `Math.max(0, …)`, divided by cpi ≥ 1).
  → Phase 2 justified.
- Survival double-loop (2000 paths × 540 months) 4.2ms vs histogram+prefix-sum
  reference 0.0–0.1ms (~50–100x), outputs exactly equal (`toEqual` on series,
  exact on stats). → Phase 3 justified.
- `randomNormalArray` + `Array.from` vs direct `Float64Array` fill at 720
  elements: no measurable difference (0.0–0.1ms both), values element-identical.
  End-to-end effect (10k throwaway copies) to be judged by M-5 before/after.
  → Phase 4 conditional.
- `pathSelection` sorts (≤10k snapshots, ≤4 sorts per run): one-time cost,
  no evidence of bottleneck. → Phase 5 NOT pursued (documented, reversible).
- Replay-equality holds: `replayMonteCarloPath(k) == sampleTimelines[k]`
  for early k (capture does not consume RNG). Seed 0 is a real seed and
  reproducible. → Phase 1 checkpoint design rests on verified assumptions.
