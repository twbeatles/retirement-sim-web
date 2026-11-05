# Retirement Sim Web — TypeScript 성능 최적화 및 Rust/WASM 도입 판단 지시서

> **대상**: [`twbeatles/retirement-sim-web`](https://github.com/twbeatles/retirement-sim-web) (`frontend/`)
>
> **문서 작성 기준**: 2026-10-15 / 확인한 `main` HEAD: `7d20016bae5839c8dbffe8dc80e44aeec7309729` (2026-10-14)
>
> **작업 종류**: 기존 금융 계산 엔진의 **측정 → 동등성 검증 → 병목 개선 → 재측정 → Rust/WASM 투자 여부 판단**
>
> **즉시 결론**: **Rust/WASM 전환 작업부터 시작하지 않는다.** 이번 지시서의 기본 목표는 TypeScript 성능 최적화이며, Rust/WASM은 후속 조건부 PoC로만 검토한다.
>
> **주의**: 문서에 인용된 경로·함수·계약은 확인 시점의 코드 기준이다. **실행 직전 최신 HEAD를 확인**하고 이미 반영된 작업은 중복하지 말 것. 저장소 코드를 이 문서대로 무비판적으로 덮어쓰지 말 것.

---

## 0. 에이전트에게 전달하는 최상위 명령

당신은 `retirement-sim-web` 저장소의 **금융 시뮬레이션 성능·정확성 담당 엔지니어**다.

1. 우선 최신 저장소 구조, `README.md`, `CLAUDE.md`, `GEMINI.md`, `docs/modeling_notes.md`, `docs/perf_automation.md`, `PROJECT_AUDIT.md`, `frontend/package.json`, CI workflow를 읽는다.
2. 본 문서에 지정한 함수가 이미 최적화됐는지, 기존 테스트에 같은 검증이 존재하는지 확인한다. **이미 해결된 문제는 제외한다.**
3. 성능 수치와 성공 여부를 **추정하거나 꾸며내지 않는다**. 직접 측정한 수치만 결과 문서에 기록하고, 실행 불가능한 환경은 `NOT_VERIFIED`로 표시한다.
4. 금융 계산의 의미론·정책을 바꾸지 않는다. `SimulationPlanV3`, `KR-2026.1`, seed 재현성, 세금·건강보험·연금·인출 순서, 생존율, 대표 경로 및 출력 API 계약을 보존한다.
5. 변경은 **작은 독립 PR/커밋**으로 나누고, 각 단계에서 테스트/타입체크/번들 게이트를 통과한 뒤 다음 단계로 진행한다.
6. 실패 시 되돌릴 수 있게 baseline, fixture, feature flag/legacy fallback을 적절히 사용한다. 예상치 못한 결과 차이를 수치 오차라고 넘기지 않는다.
7. 파일 삭제나 정리용 쉘 명령을 사용하지 않는다. `git clean -fdx`, `rmdir /s`, `Remove-Item -Recurse`, 전체 드라이브·프로젝트 외 경로 제거는 **금지**한다. 벤치마크 임시 파일은 전용 테스트 작업 디렉터리에만 만든다.
8. 사용자에게 작업 완료라고 보고할 때는 실제 **변경 파일 목록, 실행 명령, 측정 환경, baseline/after 수치, 정확성 검증 증거, 미검증 항목, 롤백 방법**을 제시한다.
9. 인터넷 또는 새 의존성 설치가 제한되면 기존 설치 환경에서 가능한 검증만 수행하고 그 한계를 보고한다. 설치 불가를 이유로 검증을 생략했다고 숨기지 않는다.
10. 사용자가 명시적으로 추가 지시하지 않는 한 **Rust, WASM, 새 서버, 별도 데이터베이스, 프레임워크 교체를 도입하지 않는다.**

### 절대 변경하지 않을 공개 계약

- `SimulationPlanV3` 및 기존 V2→V3 import migration
- `requestSimulation`, `requestSimulationBatch`, `requestSolveContribution`, `requestSolveLaborSavingsRate`, `requestSolveRetireAge` 등 worker/client 공개 API
- 결과의 `summary`, `display.representative`, `display.samples[]`, `trajectoryStats`, `survivalSeries`, `ledgerTimeline` 및 옵션에 따른 포함/미포함 semantics
- seed 고정 시 확률 경로의 재현성, 경로 인덱스 선택 및 타이브레이크
- 미리보기와 전체 계산의 작업 분리, latest-wins/coalescing, `AbortError`, 오류 처리
- `includeSampleTimelines=false` 또는 `maxSampleTimelines=0`에서 샘플이 비어야 한다는 계약
- 경로 수 상한 `MAX_FULL_MONTE_CARLO_PATHS = 10_000`; 미리보기 기본 `previewPathCap = 80`
- 역사적 데이터 범위·소득세·건강보험·연금·명목/실질 잔액 등 계산 모델

---

## 1. 현재 코드 기반 진단: 변경 후보

| 우선순위 | 실제 코드 경로 | 현 구현 및 의심 병목 | 권장 방향 |
|---|---|---|---|
| P0 | `frontend/src/logic/engine/pathReplay.ts` | 선택된 `targetIndex`까지 모든 선행 경로를 다시 계산 | PRNG 상태 checkpoint로 직접 재생, **반드시 parity 확보** |
| P1 | `frontend/src/logic/engine/runSimulation.ts` | 월별 `Float64Array` 분위수 계산 시 매월 전체 열 정렬, `sort((a,b)=>a-b)` | `sort()` 기본 숫자 정렬 검증, 비용 측정 |
| P1 | `frontend/src/logic/engine/summary.ts` | `buildSurvivalStatsFromDepletionMonths`, `buildSurvivalSeriesFromDepletionMonths`는 경로 수 × 개월 수 재검사 | histogram + prefix sum, **기존 semantics 별도 유지** |
| P2 | `frontend/src/logic/math.ts` + `engine/pathReturns.ts` | `randomNormalArray()`에서 `Float64Array`를 만들고 `Array.from()`으로 복사 | 호출처 검토 후 typed-array 직접 반환 |
| P2 | `engine/pathSelection.ts` | 대표/샘플 선택마다 배열 복사 후 정렬 | 계산 규모·프로파일 확인 후 필요할 때만 |

**주의:** 이 표는 코드에서 발견한 *성능 개선 가능성*이다. 실행 프로파일로 병목을 확정한 것이 아니다. **측정 결과가 미미한 항목은 변경하지 않는다.**

---

## 2. 작업 전 파일 확인 명령

저장소 루트에서 시작:

```powershell
 git status --short
 git rev-parse HEAD
 git branch --show-current
```

`frontend/`:

```powershell
 cd frontend
 npm ci
 npm run check:node
 npm run check:ci-contract
 npm run typecheck
 npm run lint
 npm run test -- --run
 npm run build
 npm run perf:gate:hard
```

- `npm ci`는 기존 잠금파일과 권한을 확인하고 실행한다. 오프라인 환경 등으로 불가하면 이유를 기록한다.
- 기존 `npm run verify:ci`가 위 절차 전체를 포괄하는지 확인 후 중복 실행을 줄여도 된다.
- Git working tree가 이미 dirty면 사용자의 변경을 덮어쓰지 않는다. 기존 변경 내용과 범위를 기록하고 **충돌 가능 시 이 작업의 변경을 중지**한다.
- 초기 테스트 실패를 임의 수정하지 말고 baseline defect로 따로 기록한다.

---

## Phase 0 — 변경 없는 성능 기준선과 정답 데이터 확보

### 목표

코드 변경 **이전**에 동일한 환경에서 재현 가능한 benchmark와 golden-output fixture를 구축한다. UI bundle-size 게이트와 **계산 실행시간 benchmark는 별개**임을 명확히 한다.

### 0-A. Benchmark harness

권장 신설 위치(현재 유사 기능 중복 여부 확인):

```text
frontend/scripts/perf/simulation-benchmark.ts  # 또는 기존 스크립트 구조에 맞는 파일
frontend/src/logic/perf/                 # 테스트 경계와 일치하도록 조정 가능
docs/SIMULATION_PERFORMANCE_BASELINE.md
```

기준 입력은 `SimulationPlanV3` canonical API 경계와 내부 `runSimulation` 경계를 **구분**한다. 성능을 오염시키는 UI 렌더링을 분리하고, 최종적으로 실사용 worker→UI 대기시간도 측정한다.

테스트 매트릭스:

| ID | 모드 | 경로 수 | 산출물 | 의도 |
|---|---|---:|---|---|
| D-1 | deterministic | 1 | full timeline | 비확률 계산·초기화 비용 |
| H-1 | historical | 실제 지원 기간 | full | 과거 시나리오 분기 |
| M-1 | Monte Carlo preview | 80 이하 | preview | 키 입력 후 미리보기 |
| M-2 | Monte Carlo | 100 | full | 소규모 |
| M-3 | Monte Carlo | 1,000 | full | 일반 부하 |
| M-4 | Monte Carlo | 5,000 | full | 고부하 |
| M-5 | Monte Carlo | 10,000 | full | 현재 상한 |
| M-6 | Monte Carlo | 10,000 | summary, no sample timelines | 재생성·표본 출력 분리 |
| M-7 | Monte Carlo | 10,000 | trajectory off/on | 월별 분위수 비용 확인 |
| M-8 | Monte Carlo | 10,000 | longevity/rebalancing on | 고비용 특수 분기 |

공통 입력: 시드 고정, 30~50년 범위의 현실적인 은퇴 시나리오, 정상/저자산/조기고갈/무고갈, 세금·건강보험 활성화 조합. fixture 생성 시 개인 실데이터·비밀정보는 쓰지 않는다.

측정 조건:

- 최소 5회 warmup 후 15회 이상 반복(부하가 매우 큰 M-5는 반복 수를 근거와 함께 조정), median / p95 / min / max 보고.
- Chrome 또는 Edge 실사용 browser worker 경로와 Node 기반 순수 엔진 측정을 **구분**한다. Node 결과를 브라우저 결과라고 표시하지 않는다.
- PC 사양(CPU, RAM), OS, 브라우저/Node 버전, 전원 상태, foreground/background 상태, Git SHA, 입력 hash, seed, 테스트 날짜 기록.
- 측정 지점: 입력 변환, context 구성, 경로 시뮬레이션, 분위수·생존율 집계, 대표/샘플 replay, ledger 생성, worker 직렬화·전달, UI 렌더링(가능할 때).
- 빠른 함수 마이크로벤치마크는 엔드투엔드 실사용 p95의 대체 증거가 아니다.
- 각 실험에 peak heap/가능하면 프로세스 또는 worker 메모리, 오류 유무도 기록한다. 계측이 불가능하면 `NOT_VERIFIED`.
- 네트워크 요청이나 화면 캡처 없이 실행 가능한 정적 fixture만 기본 사용한다.

### 0-B. Golden oracle 생성

수정 전 원본 엔진으로 **독립적으로 고정한** 출력 fixture를 만든다.

포함 항목:

```text
seed
path_count
input_hash
successRate
retirement assets nominal/real
final assets nominal/real
p10/p50/p90
firstDepletionMonthByPath (relevant cases)
representative.pathIndex
representative.timeline (selected key months and/or full)
samples[].pathIndex and timeline
trajectoryStats.p10/p25/p50/p75/p90
survivalSeries
survivalStats
ledgerTimeline (representative)
```

테스트 케이스: seed=0, seed=1, 일반 seed, 복수 assets, rebalancing, longevity, stress, tax/insurance, depletion, 명목·실질, `includeSampleTimelines=false`, `maxSampleTimelines=0`, `includeTrajectoryStats=false`, `includeSurvivalSeries=false`, preview, batch/solver.

**판정 규칙:**

- JSON field 존재·없음, 배열 길이, 인덱스, seed, 경로 선택은 엄격 비교.
- 같은 JS 런타임에서 정렬 방식 및 계산 구조만 바꾸는 경우 가능한 한 정확한 숫자 동등성을 요구한다.
- 경로 계산 방식을 바꾼 경우 `same seed → same per-path random stream`을 먼저 검증한다. 소수점 허용오차는 각 필드의 금액 단위와 상대오차를 고려해 사전 문서화하며 임의로 느슨하게 만들지 않는다.
- 기존 앱이 가진 **버그가 baseline fixture에 그대로 들어 있을 가능성**이 있으므로 baseline 결과와 도메인 독립 oracle(수작업 검증 가능한 간단한 계산식/edge fixture)을 **별도** 관리한다. 버그를 확인하면 '최적화'와 '동작 수정'을 섞지 않는다.

### Phase 0 Gate

- baseline 문서 생성
- benchmark 재실행 시 편차 보고
- golden-output fixture 생성 및 버전 관리
- 코드의 제품 동작 변경 없음
- 기존 lint/typecheck/test/build/perf:gate 통과 여부 기록

**이 Gate를 통과하기 전에는 제품 로직을 수정하지 않는다.**

---

## Phase 1 — 난수 경로 재생(`pathReplay.ts`) 비용 제거

### 현재 코드의 핵심 문제

`replayMonteCarloPath()`는 `setSeed()`로 난수열을 처음부터 복원한 후, `targetIndex`까지 `simulateOnePath()`를 반복 실행한다. 최종 계산에서 대표 경로와 다수 샘플을 재생성할 때 **큰 중복 연산**이 발생할 수 있다.

### 요구사항

**무조건 pathIndex를 seed로 독립 설정하는 방식은 금지.** 현재 Mulberry32 전역 난수 발생기를 연속 소비하는 순서가 시뮬레이션 결과 계약에 영향을 줄 수 있기 때문이다.

정확한 개선안:

1. `math.ts`의 기존 Mulberry32 알고리즘, Box–Muller 정규난수 로직을 유지한다.
2. 시드가 주어진 경우에 한해 **현재 난수 generator 내부 상태를 읽고 복원하는 최소 인터페이스**를 설계한다. 예: `snapshotRngState()` / `restoreRngState(state)` (함수명은 코드 스타일에 맞춰 조정).
3. **각 경로의 장수 리스크 난수 추출 및 일반 자산 수익률 난수 추출 모두 시작하기 이전**에 상태를 기록한다. 연속 소비 순서가 바뀌어서는 안 된다.
4. 원본 시뮬레이션 종료 후 경로 인덱스별 checkpoint를 이용해 필요한 대표/샘플만 **직접 1회 실행**한다. 현재 매 경로마다 무조건 full timeline을 보관하지 않는 메모리 최적화는 유지한다.
5. checkpoint는 uint32 수준의 작은 상태로 충분한지 검증하고, 실제 필요한 숫자 및 상태만 보관한다. seed 없는 `Math.random()` 모드에서 snapshot/restore가 불가능하면 **원래 구현으로 fallback**한다. 허위 재현성을 제공하지 않는다.
6. `setSeed()`가 다른 실행 경로(worker, solver, batch, preview)에 미치는 부작용을 검사한다. 모듈 전역 RNG와 worker의 작업 큐가 충돌하지 않도록 한다.
7. `replayHistoricalPath` 경로는 의미 없이 변경하지 않는다.

### 도입 전략

- 먼저 `pathReplay` 테스트에 실제 원본 출력을 oracle로 고정한다.
- internal `legacy replay` 구현을 임시 보존하여 개발 중 A/B 비교한다.
- 신규 replay가 실패하거나 parity가 깨지면 legacy로 rollback 가능하도록 경계를 둔다.
- 모든 정상 parity gate를 통과하고 나서만 중복 로직을 제거할 수 있다.

### 필수 테스트

- pathIndex `0`, `1`, 중간, 마지막
- 대표/샘플이 1개·3개인 경우
- seed `0`, `1`, 큰 정수 및 `undefined`
- 장수 리스크 off/on (경로별 연령 변동)
- 자산 배분/리밸런싱 off/on (추가 난수 소비)
- `stress_test`, 다양한 세금·연금·인출 규칙
- 동일 seed, 동일 입력, 2회 실행에서 동일한 결과
- snapshot/restore 후 **원래 난수 시퀀스** 완전 재현
- 원래 결과와 대표·샘플 `pathIndex`, timeline, summary, trajectory, ledger 동등성
- checkpoint capture 시 추가 시간·메모리 허용 범위 측정

### Phase 1 Gate

- 재생한 각 선택 경로가 기존과 일치
- 전체 계산 결과, seeded 난수열, UI/worker API 동일
- 경로 재생성 횟수·시간이 실제로 감소했음을 측정 증명
- PR에는 benchmark before/after 및 rollback 경로 명시

**참고:** 난수 checkpoint 자체가 전체 계산 순서를 바꾸어 결과가 달라진다면 채택하지 않는다. 불필요하게 대규모 RNG 리팩터링을 선행하지 않는다.

---

## Phase 2 — TypedArray 분위수 정렬 최적화

관련 파일: `frontend/src/logic/engine/runSimulation.ts`.

현재:

```ts
column!.sort((a, b) => a - b);
```

검증할 후보:

```ts
column!.sort();
```

`Float64Array.prototype.sort()`의 기본 정렬은 숫자 정렬이다. 일반 JS 배열의 문자열 비교 기본값과 혼동하지 않는다.

### 사전 테스트

- 유한한 양수/음수/0/`-0` 값
- 동률, 매우 큰 금액, 미세한 소수, 상·하한
- `NaN`, `Infinity`가 정책상 정상 입력에 들어오지 않는지 확인
- 기존 comparator와 기본 정렬의 p10/p25/p50/p75/p90 및 tie 처리 비교
- 동일 배열을 매 반복 완전히 새로 구성하거나 복제하여, 이전 정렬의 영향을 받지 않는 공정한 벤치마크

### 구현

- golden parity가 보장되면 한 줄 변경으로 시작한다.
- 월별 `allTraj`의 반복 sort 비용을 profile에서 따로 기록한다.
- 복잡한 `quickselect`, heap, SIMD 또는 WASM 알고리즘을 **선제적으로 도입하지 않는다.**
- 사용자가 체감하지 못할 정도로 차이가 작다면 단순성을 기준으로 최종 선택한다.

### Gate

- 모든 분위수 결과 동등
- 정렬 마이크로벤치와 전체 시뮬레이션 benchmark 비교
- 기존 test/typecheck/build 통과

---

## Phase 3 — 생존율 집계 O(paths×months) 개선

관련 파일: `frontend/src/logic/engine/summary.ts`.

검토 대상:

```ts
buildSurvivalStatsFromDepletionMonths(...)
buildSurvivalSeriesFromDepletionMonths(...)
```

현재 각 월마다 전체 경로의 `firstDepletionMonthByPath`를 반복 조사한다.

### 개선 접근

1. 경로별 소진 월을 확인해 `depletionCount[month]` 히스토그램 생성.
2. `month`를 순회하며 누적 소진 개수를 증가.
3. `depletionMonth === month`는 현재 원본 구현의 `depletionMonth > month` 조건과 동일하게 **해당 월부터 소진**으로 센다.
4. `depletionMonth < 0`은 원본 구현대로 미소진 처리.
5. 정상 범위 밖 값, `null`/비정상 값, 부동소수점/정수 값에 대한 입력 계약 확인 후 원래와 동일하게 처리할 것. 이를 이유로 새 정상화 정책을 만들지 않는다.
6. 두 함수의 public output shape를 보존하고 필요하면 내부 공통 helper만 만든다.

### 특별 주의

`runSimulation.ts`에서 `allTraj` 잔액이 양수인지로 만드는 `survivalSeries`와, `summary.ts`에서 **소진 월**로 만드는 `survivalStats`는 현재 서로 다른 경로를 사용할 수 있다. **이를 임의로 하나의 공식으로 합치면 안 된다.** 장수 리스크 때문에 조기 종료된 경로의 `allTraj` 부분도 기존 처리와 동일해야 한다.

### 테스트

- 완전 생존 / 첫 달 소진 / 마지막 달 소진 / 동률 소진
- `depletionMonth = -1`, `0`, `month`, `month+1`
- 경로 수 `0`, 개월 수 `0`, 표본 경로 수 적은 경우
- 장수 리스크로 궤적이 일찍 끝나는 경우
- 샘플 1, 80, 1000, 10000 경로
- legacy double-loop 구현과 optimized histogram 결과 비교
- `finalSurvivalRate`, `lowestSurvivalRate`, `firstBelowHundredPercentAge`, age floor semantics 동등성

### Gate

- 기존 샘플 모두 출력 동등
- 시간복잡도 개선의 benchmark 근거 존재
- 결과 전체의 downstream UI/차트 테스트 통과

---

## Phase 4 — `randomNormalArray()` 메모리 복사 제거 검토

관련 파일:

```text
frontend/src/logic/math.ts
frontend/src/logic/engine/pathReturns.ts
```

현재 일반적인 흐름:

```ts
const arr = new Float64Array(size);
// 값 기록
return Array.from(arr);
```

### 요구사항

- 먼저 `randomNormalArray` 사용처 전체를 검색한다.
- 모든 호출부가 `Array` 고유 메서드, 제네릭 타입, spread, serialization 등에 의존하지 않는지 확인한다.
- 단일 hot path에서만 `Float64Array`를 유지해도 된다. 모든 사용처를 무조건 바꾸지 않는다.
- 현재 반환을 기다리는 다른 모듈의 API를 깨지 않는다. 필요한 경우 `randomNormalTypedArray()`를 **별도 함수로 추가**하고 기존 함수를 유지한다.
- TypeScript의 `number[] | Float64Array` union을 남용해 호출처 타입·처리가 복잡해진다면 소규모 함수 분리 방식으로 정리한다.

### Gate

- RNG 시드 및 난수 배열 값 동등
- 크기·성능 이득 측정
- `Math.random()` fallback 동작 변경 없음
- 타입 체크·전체 테스트 통과

---

## Phase 5 — 추가 최적화 여부 판단 (기본적으로 선택 작업)

다음은 직접 profile에서 의미 있는 병목이 확인된 경우에만 수행한다.

- `engine/pathSelection.ts`: 대표/샘플 경로 선택에 정렬 대신 선형 스캔 적용 가능성. **거리 비교·동률 시 가장 낮은 인덱스 선택** 의미론 보존.
- `runSimulation.ts`: 월별 궤적 저장과 정렬 비용을 줄이는 구조 최적화. 분위수 정확도 손실 또는 approximate percentile 알고리즘은 금지.
- `engine/context.ts`: 경로별 반복 계산되는 값의 사전 계산. `ctx`와 path-local 상태 구분, 사용자 규칙 차이 검증.
- `planSimulation.ts`: result ledger에서 동일한 stream filter를 반복하는 구간. 금액·과세 플래그·시점 정확성 유지.
- Worker 데이터 직렬화: 결과 객체가 커서 `postMessage` 비용이 높을 때만 전송량 축소. 출력 계약 변경 금지.

**이번 계획은 성능 향상이 목표이므로 최적화 대상이 아닌 GUI 대규모 리팩터링, TypeScript 전면 재구성, 새로운 DB 추가를 하지 않는다.**

---

## Phase 6 — 회귀·독립 Oracle·장애 검증

### A. 기존 검증 명령

```powershell
cd frontend
npm run lint
npm run typecheck
npm run check:imports
npm run check:duplicates
npm run test -- --run
npm run build
npm run perf:gate:hard
npm run verify:ci
```

중복 범위는 현재 `package.json`을 기준으로 적절히 생략할 수 있으나, 최종적으로 `verify:ci`는 반드시 실제 실행을 시도한다.

### B. Golden parity 테스트

- Phase 0에서 **수정 전 고정한** JSON oracle을 신규 구현이 통과해야 한다.
- 동일한 공통 함수에 기존/신규 구현을 억지로 합치지 말고, 독립적인 단순 reference implementation 또는 fixture를 별도로 보관한다.
- 전체 확률 분포, 성공률, 대표 경로, 샘플 경로, `ledgerTimeline`을 함께 검증한다.
- 단순 synthetic 계산식(0% 수익률, 고정 납입·인출, 명확한 소진 월)은 독립 수작업 식과 비교한다.

### C. Mutation / Negative Tests

선택한 신규 테스트에 대한 mutation 시나리오:

```text
RNG checkpoint를 첫 난수 이후에 저장하기
대표 경로 checkpoint를 1개 뒤 인덱스에 사용하기
상태 복원 없이 다음 경로를 replay하기
소진 월의 비교를 <에서 <=로 교란하기
월별 분포 분위수 인덱스의 off-by-one
정렬 방향 역전
seed=0을 falsy로 취급하기
```

각 mutation이 적합한 테스트에서 **실제로 잡히는지** 확인하고 증거를 남긴다. mutation 도구가 설치되어 있지 않다면 소규모 수동 mutation으로도 충분하다. 수행하지 못했다면 `NOT_VERIFIED`로 표기한다.

### D. UI/Worker E2E

- 80 경로 미리보기 요청을 빠르게 연속 발생시켜 latest-wins / `AbortError` 유지 확인
- 전체 시뮬레이션 중 미리보기 정상 응답 확인
- batch / solver / pension optimization 등의 Worker 응답 타입과 에러 경계 유지
- 샘플이 없는 결과의 차트·프린트 렌더링 확인
- low-end 모바일/느린 CPU/메모리 제한은 가능하면 별도 환경에서 검증; 접근할 수 없으면 `NOT_VERIFIED`

---

## Phase 7 — Rust/WASM Go/No-Go 결정

이번 Phase는 **의사결정 문서 작성까지만 기본 의무**이며 Rust 구현은 기본 범위에서 제외한다.

### 판단 조건

Rust/WASM PoC에 진입하려면 다음 중 하나 이상이 *최적화된 TypeScript 기준*에서 관찰되어야 한다.

- 실제 사용자 환경의 복잡한 1,000~10,000경로 full simulation p95가 제품 UX 기준을 의미 있게 초과
- 전체 소요시간의 상당 부분이 path simulation **수치 계산 자체**이고 JS 알고리즘/자료구조 개선으로는 해소 불가
- 시나리오 비교·대량 batch 계산 도입 계획 때문에 기존 처리량이 실제 부족

**예시 투자 게이트(프로젝트 상황에 맞게 사전 합의):** Rust/WASM 전체 계산 p95가 최적화 TS 대비 **30~40% 이상 감소**, 결과 동등, 초기 로딩·메모리·브라우저 호환성 악화 없음. 이 값은 **실측 결과가 아니라 채택 목표**다.

### PoC를 승인받은 후에만 수행할 수 있는 범위

```text
Rust/WASM: 순수 수치 계산 경로(batch 단위)
TypeScript: UI, PlanV3 validation, 국내 규칙 관리, Worker orchestration,
            serialization, 결과 시각화, storage
```

- `wasm-bindgen` 등 새로운 빌드 도구와 WASM artifact는 **별도 승인 후** 도입한다.
- 작은 함수마다 JS↔WASM 경계로 건너는 구조는 피하고 한 번에 충분한 계산을 전달한다.
- seeded PRNG/Box–Muller/부동소수점 재현성, Windows·Android Chrome·Safari 비교를 우선 검증한다.
- WebAssembly threads/SharedArrayBuffer 사용은 배포환경의 cross-origin isolation 등 요구사항을 확인하기 전에는 전제하지 않는다.
- Rust PoC가 성능·정확성·배포 조건을 충족하지 못하면 **TypeScript 유지 결정**을 정식으로 문서화한다.

---

## 8. PR/커밋 권장 분할

| 순서 | PR 이름 예시 | 변경 내용 | 중단 가능 조건 |
|---|---|---|---|
| 0 | `test: establish simulation performance and golden baselines` | benchmark, baseline docs, oracle | 재현 가능한 측정 불가 |
| 1 | `perf: checkpoint seeded Monte Carlo path replay` | RNG checkpoint + replay + 테스트 | 난수·timeline parity 실패 |
| 2 | `perf: optimize typed-array percentile sorting` | comparator 제거 후보 + 테스트 | 출력 차이 또는 개선 무의미 |
| 3 | `perf: linearize depletion-based survival aggregation` | histogram 집계 + 테스트 | survival semantics 차이 |
| 4 | `perf: avoid temporary normal array copies` | typed-array 경로 + 테스트 | API/메모리 회귀 |
| 5 | `docs: assess Rust WASM ROI against optimized TypeScript` | 최종 수치·결정 문서 | 완료 필수 |

기존 브랜치가 PR 중심 workflow가 아니어도 **커밋 단위의 변경 범위와 근거를 동일하게 유지**한다. 독립 PR에 걸맞은 작은 범위로 구현하라.

---

## 9. 필수 산출물

최종적으로 다음 문서를 저장소의 적절한 `docs/` 하위에 남긴다.

```text
docs/SIMULATION_PERFORMANCE_BASELINE.md
docs/SIMULATION_GOLDEN_PARITY.md
docs/SIMULATION_PERFORMANCE_RESULTS.md
docs/RUST_WASM_GO_NO_GO.md
```

### `SIMULATION_PERFORMANCE_RESULTS.md` 표 양식

| 시나리오 | Before median | Before p95 | After median | After p95 | 상대 개선 | 메모리 | parity | 상태 |
|---|---:|---:|---:|---:|---:|---:|---|---|
| preview 80 | 측정 | 측정 | 측정 | 측정 | 계산 | 측정/미검증 | PASS/FAIL | ... |
| MC 1k full | 측정 | 측정 | 측정 | 측정 | 계산 | 측정/미검증 | PASS/FAIL | ... |
| MC 10k full | 측정 | 측정 | 측정 | 측정 | 계산 | 측정/미검증 | PASS/FAIL | ... |
| MC 10k no samples | 측정 | 측정 | 측정 | 측정 | 계산 | 측정/미검증 | PASS/FAIL | ... |
| MC 10k longevity | 측정 | 측정 | 측정 | 측정 | 계산 | 측정/미검증 | PASS/FAIL | ... |

수치가 없으면 0, 미측정 추정치를 채우지 말고 **`NOT_VERIFIED`**를 그대로 넣는다.

### 종료 보고 템플릿

```text
# 최종 보고
- 기준/최종 commit SHA:
- 변경된 파일 목록 및 변경 이유:
- 제거한 중복 작업/이미 해결된 항목:
- 테스트: 명령, PASS/FAIL, 실행 환경:
- 기존 oracle 비교: PASS/FAIL 및 허용오차 근거:
- 성능: 시나리오별 before/after median·p95·메모리:
- 가장 큰 병목과 해결 기여:
- 동작상 변경 사항: 없음 / 의도적 차이 상세:
- Rust/WASM 판단: GO / NO-GO / INCONCLUSIVE:
- 미검증 환경 및 위험:
- 되돌리기 방법:
```

---

## 10. 완료 정의 및 최종 중단 규칙

### 기능 안전 Gate

- 기존 전체 regression test 통과
- typecheck, lint, import boundary, CI contract, production build, bundle-size gate 통과
- Golden parity 및 independent oracle 모두 통과
- worker preview/full, batch/solver, 저장/불러오기, 결과 차트·리포트의 공개 동작 보존
- seed `0` 포함 난수 경로 및 대표/샘플 경로 동등성 입증

### 성능 Gate

- 사전·사후 같은 기기와 조건에서 비교
- 최소 일반/최대 부하와 미리보기 경로 포함
- median·p95, 메모리, 실제 사용자 대기시간을 따로 보고
- 최적화로 감소한 작업량·재계산 횟수까지 계측

### **중단 기준**

1. 금융 결과의 설명할 수 없는 차이가 발생하면 즉시 해당 변경을 되돌리고 원인 분석.
2. 성능 개선이 측정 노이즈 안에 있거나 배포·테스트 비용이 이익보다 크면 해당 최적화는 적용하지 않음.
3. 실제 사용자 작업이 충분히 빠르면 Rust/WASM PoC를 **시작하지 않음**.
4. 테스트 도구/브라우저/OS 환경이 없어 전체 결과를 확인할 수 없으면 **부분 검증**으로 보고하고 릴리스 성공을 주장하지 않음.
5. 사용자의 개인 재무 데이터, 운영 저장소 원본, 시스템 디렉터리, 임의 다른 드라이브를 테스트에 사용하지 않음.

**이 계획의 성공은 Rust 코드를 작성하는 것이 아니라, 금융 시뮬레이터의 정확성을 보존하면서 불필요한 반복 연산을 줄이고 언어 전환의 ROI를 수치로 판정하는 것이다.**

---

## 에이전트에게 바로 내릴 첫 번째 실행 명령

> 저장소 최신 HEAD에서 본 지시서를 읽고, **먼저 Phase 0만 수행**하라. 최신 README/CLAUDE/GEMINI 및 CI를 확인한 다음 기존 테스트·빌드 실행 결과를 기록하고, 시나리오별 성능 기준선과 독립 golden oracle을 작성하라. 현재 코드를 수정하지 말고 벤치마크 방법·측정 환경·예상 최적화 지점을 보고하라. Phase 0 Gate가 충족되고 증거가 제출된 뒤에만 Phase 1~4를 순서대로 구현하라. 각 Phase에 정확성 검증, 성능 수치, 변경 파일, 롤백 전략을 반드시 남겨라. Rust/WASM은 Phase 7 판단에서 GO로 승인되기 전까지 구현하지 말 것.
