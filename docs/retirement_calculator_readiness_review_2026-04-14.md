# 은퇴계산기 실사용 전환 점검 보고서

작성일: 2026-04-14

## 0. 리팩토링 추적 메모

- 이 문서의 일부 파일 경로/라인 번호는 대형 리팩토링 이전 기준입니다.
- 현재 코드베이스는 `frontend/src/components/advanced-settings/`, `frontend/src/logic/engine/`, `frontend/src/logic/validation/`, `frontend/src/logic/planV2/` 폴더로 책임이 분리되어 있습니다.
- 기능적 진단 결론은 유지되지만, 세부 구현 위치는 위 폴더 기준으로 다시 추적하는 편이 정확합니다.

## 1. 결론

현재 프로젝트는 `실제 은퇴계산기`라기보다 `은퇴 시뮬레이션 프로토타입 + 고급 시각화 도구`에 가깝습니다.

장점은 분명합니다.

- Web Worker 기반 계산 구조가 잡혀 있고, 타입체크/테스트/빌드가 통과합니다.
- 몬테카를로, 역사적 백테스트, 다양한 인출 전략, 시나리오 저장, 출력 UI까지 이미 들어 있습니다.

하지만 아래 이유 때문에 지금 상태로는 실사용 배포 기준에 미달합니다.

- 세금, 건강보험료, 연금 규칙이 일부 연도 기준으로 하드코딩되어 있고 여러 곳에서 단순화되어 있습니다.
- 핵심 현금흐름 모델이 실제 가계 기준보다 너무 단순합니다.
- 일부 전략은 UI 설명만 고급이고 엔진 구현은 축약/미완성 상태입니다.
- 결과 라벨과 내부 지표가 어긋나는 구간이 있어 사용자 신뢰를 해칠 수 있습니다.

판정:

- 내부 데모/개인 실험용: 가능
- 외부 사용자 대상 “실제 은퇴계산기” 서비스: 아직 부적합

## 1-1. 구현 현황 업데이트 (2026-04-14)

이 문서 작성 이후 아래 항목은 코드에 반영되었습니다.

- `SimulationPlanV2` 기반 저장/편집/JSON import-export
- KR 규칙 메타데이터와 역사 데이터 범위 표기
- `retirementPoint`, `terminalStats`, `depletionStats`, `survivalStats`, `assumptionWarnings`
- 역사적 백테스트의 `mode: "historical"` 정식 분리
- 결과 화면/인쇄 리포트의 원장 요약 및 필수생활비 충족률 표시
- `plan_v2` 필드까지 포함한 입력 검증 확장
- 원시 CSV export와 사용자용 인쇄 리포트 역할 분리

아직 남은 큰 항목:

- `plan v2 -> legacy input -> engine` 어댑터 제거
- 계좌별 ledger-native 인출 엔진
- 국민연금 상세 산식
- 버킷 실잔고/리필 로직
- 생명표 기반 장수모델

## 2. 확인 범위

검토한 주요 파일:

- `README.md`
- `docs/modeling_notes.md`
- `docs/roadmap.md`
- `frontend/src/logic/types.ts`
- `frontend/src/logic/validation.ts`
- `frontend/src/logic/engine.ts`
- `frontend/src/logic/koreaTax.ts`
- `frontend/src/logic/riskAnalysis.ts`
- `frontend/src/logic/solver.ts`
- `frontend/src/components/SimpleDashboard.tsx`
- `frontend/src/components/ReportPrintView.tsx`
- `frontend/src/components/WithdrawalSettings.tsx`
- `frontend/src/components/AdvancedSettings.tsx`
- `frontend/src/components/layout/sections/*.tsx`

검증 실행:

- `npm run typecheck` 통과
- `npm run test -- --run` 통과
- `npm run build` 통과

중요한 해석:

- 위 검증은 “코드가 현재 스키마 기준으로 동작한다”는 뜻입니다.
- 위 검증은 “실제 제도와 생활비 구조를 충분히 반영한다”는 뜻이 아닙니다.

## 3. 현재 강점

이미 잘 되어 있는 부분은 유지해야 합니다.

- 계산 엔진과 UI가 분리되어 있어 기능 확장이 비교적 수월합니다.
- Worker 기반이라 무거운 계산을 넣어도 UI 구조를 크게 깨지 않고 확장할 수 있습니다.
- 시나리오 저장, 비교, 차트, 인쇄 리포트, CSV 내보내기까지 기본 제품 형태가 있습니다.
- 테스트가 엔진/세금/수학/solver/worker queue까지 커버하고 있어 리팩터링 기반은 괜찮습니다.

## 4. P0: 실사용 전에 반드시 수정/추가해야 할 항목

### P0-1. 세금/건강보험/제도 규칙을 하드코딩에서 분리해야 함

현재 가장 큰 문제입니다. “한국형” 계산기라고 보기에는 규칙이 연도별 상수와 단순식으로 박혀 있습니다.

근거:

- `frontend/src/logic/engine.ts:933` `KR 2023 brackets`
- `frontend/src/logic/koreaTax.ts:2` `2024 Standards`
- `frontend/src/logic/riskAnalysis.ts:277` `Korean 2026 reference table`
- `frontend/src/logic/constants.ts:137-138` `law_2026`, `lawYear: 2026`
- `frontend/src/logic/validation.ts:261` `세액공제 법령 연도는 2026으로 고정됩니다.`

문제:

- 규칙 변경 시 코드 수정 없이는 즉시 오차가 납니다.
- 엔진, 리스크 분석, UI 기본값에 연도 규칙이 분산돼 있어 불일치가 발생하기 쉽습니다.
- 사용자는 현재 연도 기준으로 계산된다고 오해하기 쉽습니다.

필수 조치:

- `rules/kr/{year}.ts` 또는 JSON 기반 규칙 레이어 도입
- 적용 기준일(`effective_date`)과 계산 기준 연도 표시
- 세금, 건보료, 세액공제, 연금 규칙을 한 모듈에서 버전 관리
- 결과 화면에 “적용 규칙 버전” 명시

### P0-2. 세금/건강보험 계산을 계좌 유형별 현금흐름 엔진으로 바꿔야 함

현재는 “인출액”과 “소득”이 충분히 구분되지 않습니다. 실제 은퇴 계산에서 이 부분은 핵심입니다.

근거:

- `frontend/src/logic/engine.ts:877` 건강보험 계산 소득을 `natPension + privPension + additionalPensionPayout` 중심으로 단순화
- `frontend/src/logic/engine.ts:870` `Safe approximation`
- `frontend/src/logic/engine.ts:924-954` 세금 계산이 월 합계 기반 연환산 단순식
- `frontend/src/logic/engine.ts:931` `Simplified annualized`

문제:

- 원금 인출, 이자/배당, 연금소득, 사업소득, 임대소득, 퇴직금, 주택연금이 서로 다른 과세/건보료 처리 로직을 가져야 하는데 현재는 통합 처리에 가깝습니다.
- 일반계좌, 연금계좌, 비과세/과세 계좌 구분이 없습니다.
- 인출 순서 전략도 없습니다.

필수 조치:

- 자산을 “계좌/세제 유형” 단위로 분해
- 현금흐름을 `principal`, `capital_gain`, `interest_dividend`, `pension_income`, `business_income`, `rental_income`, `severance`, `reverse_mortgage`로 분리
- 세금/건보료는 위 분류를 입력으로 받는 별도 계산기로 이동
- 인출 우선순위 전략(예: 현금 -> 일반계좌 -> 연금계좌)을 추가

### P0-3. 국민연금/개인연금/퇴직연금 모델을 “사용자 직접 입력” 중심에서 “계산 가능한 모델”로 올려야 함

현재 연금은 실제 제도 계산보다 사용자가 결과값을 미리 넣는 구조가 강합니다.

근거:

- `frontend/src/logic/types.ts:83-85` 국민연금은 `expected_monthly_benefit_at_retirement`, `startAge`만 받음
- `frontend/src/components/layout/sections/PensionSection.tsx:18,32` 국민연금 입력이 “은퇴 시 예상 월 수령액”과 “수령 개시 연령” 중심
- `frontend/src/logic/engine.ts:632-633` 추가 연금 DB/National fallback이 `0.5% of capitalized value`
- `frontend/src/logic/engine.ts:651,656-657` 추가 연금 payout이 `Balance / MonthsLeft` 또는 `0.5% monthly`

문제:

- 국민연금 가입기간, 평균소득, 추납/임의가입, 감액/증액 규칙, 부부합산 전략이 없습니다.
- IRP/연금저축/DC/DB를 실제 상품/제도 규칙보다 단순 잔액 인출로 다룹니다.
- 퇴직금과 주택연금도 “월 수령액을 외부에서 구해 넣는 방식”에 가깝습니다.

필수 조치:

- 국민연금 입력 모드 2개 제공:
  - 간편 모드: 예상 월수령액 직접 입력
  - 상세 모드: 가입기간, 기준소득, 예상 수령액 자동 산출
- 개인연금/퇴직연금은 계좌 유형, 수수료, 세제, 수령방식 분리
- 주택연금은 내부 추정식 또는 외부 계산기 연동 결과를 구조화 저장

### P0-4. 생활비 모델을 “단일 목표 생활비”에서 “단계별 가계 현금흐름”으로 바꿔야 함

실제 은퇴계산기는 수익률보다 생활비 구조가 더 중요할 때가 많습니다.

근거:

- `frontend/src/components/WithdrawalSettings.tsx:57-58` 은퇴 생활비 입력이 `targetMonthlySpending` 단일 값
- `frontend/src/components/ExpenseManager.tsx:141` `목돈 지출 이벤트`
- `frontend/src/components/SimpleDashboard.tsx:11-15,110-195` 간편 모드는 나이/자산/저축만 받고 결과를 생성

문제:

- 은퇴 초기/중기/후기 지출 패턴이 없습니다.
- 필수생활비와 선택생활비 분리가 없습니다.
- 주거비, 의료비, 여행비, 자녀지원, 자동차 교체, 간병비를 구조화하지 못합니다.
- 간편 모드는 생활비와 연금 입력 없이 “은퇴 성공 점수”를 보여줘 오판 위험이 큽니다.

필수 조치:

- 생활비를 `essential`, `discretionary`, `medical`, `housing`, `dependent_support` 등으로 분리
- 은퇴 단계별 지출 곡선 지원
- 간편 모드에도 최소한 `예상 월생활비`, `국민연금`, `개인연금`, `주거상태`를 받도록 개편

### P0-5. 버킷 전략과 세금효율 리밸런싱을 실제 동작하게 만들어야 함

현재 이 둘은 설명 대비 구현이 약합니다.

근거:

- `frontend/src/logic/engine.ts:416` `Since this model does not track separate cash buckets`
- `frontend/src/logic/engine.ts:458` `Bucket State (Future expansion)`
- `frontend/src/logic/engine.ts:836` 부근의 bucket 전략은 사실상 `targetMonthlySpending` 차감 로직

문제:

- 버킷 전략은 실제 버킷 잔고/보충/소진/리필이 구현되지 않았습니다.
- tax-efficient rebalancing은 “강제 매도 안 함” 수준이고, 별도 현금 버킷이 없어서 실질적 의미가 약합니다.

필수 조치:

- 단기/중기/장기 버킷 실잔고 상태 도입
- 버킷별 기대수익률, 보충 규칙, 위기 시 인출 우선순위 구현
- buy-only rebalancing이 실제로 동작하도록 현금/신규납입 분리

### P0-6. 결과 지표와 라벨을 바로잡아야 함

지금은 “은퇴 시점 자산” 같은 표현이 실제 계산값과 어긋나는 구간이 있습니다.

근거:

- `frontend/src/components/SimpleDashboard.tsx:49,282`
- `frontend/src/components/ReportPrintView.tsx:65-73`
- `frontend/src/logic/types.ts:281` 이미 `retirementPoint` 필드가 있음

문제:

- `SimpleDashboard`의 `예상 은퇴 자산 (중위값)`은 `summary.mc.totalAssetsReal.p50`을 보여주는데, 이 값은 구조상 최종시점 자산 통계입니다.
- `ReportPrintView`도 같은 혼선이 있습니다.
- 역사적 모드는 `frontend/src/logic/engine.ts:1390`에서 UI 호환 때문에 `mode: "montecarlo"`로 반환되어 표현 계층 혼선을 유발합니다.

필수 조치:

- 은퇴시점 값은 `summary.retirementPoint`를 사용
- 최종 잔존 자산은 `finalTotalAssetsReal` 또는 별도 P50/P10/P90 명칭으로 표시
- UI는 `mode`와 `summary.source`를 혼동하지 않도록 분리

### P0-7. 기본 숫자 검증을 대폭 강화해야 함

현재 검증은 연령/포트폴리오/일부 고급 항목 위주입니다. 실서비스에서 가장 자주 깨지는 기본 숫자 검증이 부족합니다.

관찰:

- `frontend/src/logic/validation.ts`에는 `general.current_balance`, `general.monthly_contribution`, `private_pension.monthly_contribution`, `debt.monthly_payment`, `withdrawal.taxRate`, `withdrawal.fixedMonthlyAmount`, `withdrawal.targetMonthlySpending` 등에 대한 체계적 범위 검증이 없습니다.
- 검색상 위 항목 중 검증이 직접 들어간 것은 `labor_income.currentNetMonthlyIncome` 정도입니다.

필수 조치:

- 모든 금액 필드에 `0 이상`, 합리적 상한, NaN/Infinity 방어 추가
- 세율/수익률/변동성/저축률은 공통 validator로 통합
- 음수 값 허용 항목과 금지 항목을 명시적으로 분리

## 5. P1: 실사용 품질을 크게 높이는 고우선 항목

### P1-1. 자산수익률 모델을 단일 rho GBM에서 개선해야 함

근거:

- `frontend/src/logic/engine.ts:53` 모든 자산에 단일 상관계수 `rho` 적용
- `docs/modeling_notes.md`도 기본적으로 GBM 중심
- `frontend/src/logic/historicalData.ts` 데이터 범위가 `1985-2024`

문제:

- fat tail, regime shift, 장기 저성장, inflation regime 전환을 충분히 반영하지 못합니다.
- 역사적 데이터도 2024까지만 있어 최신 정합성 관리 체계가 없습니다.

권장:

- 자산별 상관행렬 지원
- 블록 부트스트랩 또는 regime-based simulation 추가
- 자본시장 가정(CMA) 버전 관리
- 역사 데이터 업데이트 파이프라인 구축

### P1-2. 장수 리스크를 정규분포 대신 생명표 기반으로 바꿔야 함

근거:

- `frontend/src/logic/types.ts:402` 장수 리스크는 평균/표준편차 기반
- `frontend/src/components/AdvancedSettings.tsx:704` UI도 장수 리스크 토글 수준

문제:

- 실제 사망확률 구조와 다릅니다.
- 부부/가구 기준 joint survival이 불가능합니다.

권장:

- 성별/출생연도별 생명표 적용
- 1인/부부/가구 생존 시나리오 지원

### P1-3. Solver 결과를 더 보수적으로 만들어야 함

근거:

- `frontend/src/logic/solver.ts:39,82,135` solver는 `mc_paths = 100`
- `frontend/src/logic/solver.ts:137` 은퇴 나이 성공률의 단조성을 전제로 함

문제:

- 몬테카를로 샘플 수가 낮아 경계값이 흔들릴 수 있습니다.
- 단조성 가정은 현실적으로 대체로 맞지만 항상 안전한 건 아닙니다.

권장:

- solver 전용 저분산 샘플링 또는 seed ensemble 사용
- 결과를 점값이 아니라 범위로 제시
- “추천 은퇴나이 ± 1년” 식의 신뢰구간 표시

### P1-4. 주택/부채/거주상태 전환을 별도 모델로 분리해야 함

현재 부동산과 부채가 단순 잔고 기반이라 실제 은퇴 의사결정과 거리가 있습니다.

문제:

- 실거주 주택 매각/다운사이징/전세전환/월세전환이 없습니다.
- 대출이 실제 상환스케줄이 아니라 단순 잔고/월납입 구조입니다.
- 역모기지(주택연금)는 내부 계산보다 외부 결과 입력에 의존합니다.

근거:

- `frontend/src/components/AdvancedSettings.tsx:508` HF 사이트에서 예상 수령액 계산 가능

권장:

- 주거전략 엔진 추가
- 원리금 균등/원금 균등 상환 스케줄 지원
- 실거주/투자용 부동산의 세금/현금흐름 분리

### P1-5. 결과 다운로드를 “설명 가능한 보고서”로 바꿔야 함

근거:

- `frontend/src/logic/export.ts:93-98` 몬테카를로는 첫 번째 sample path를 내보냄
- `frontend/src/components/layout/sections/ResultsSection.tsx:128` 현재 다운로드는 CSV 중심

문제:

- 사용자가 받은 CSV가 대표 시나리오라고 오해할 수 있습니다.
- 가정, 규칙 버전, 사용한 수익률/세율/생명표가 함께 남지 않습니다.

권장:

- PDF 또는 Markdown 보고서 생성
- “입력값 + 규칙 버전 + 결과요약 + 민감도 + 경고”를 한 문서로 묶기
- CSV는 raw export, 보고서는 사용자용으로 역할 분리

## 6. P2: 운영/제품 완성도 항목

### P2-1. E2E 회귀 테스트와 골든 시나리오 세트 추가

현재 단위 테스트는 괜찮지만 사용자 흐름 테스트가 없습니다.

권장:

- 대표 사용자 10~20개 시나리오에 대한 golden result 저장
- Playwright 기반 입력-결과 E2E 추가
- 규칙 버전 업데이트 시 차이 리포트 자동 생성

### P2-2. 가정/버전/경고를 제품 레벨에서 명시

실사용 계산기는 숫자보다 설명이 중요합니다.

권장:

- 결과 카드에 “이 계산은 어떤 가정에 기반하는지” 표시
- 규칙 버전, 역사 데이터 범위, 시뮬레이션 모드, 경고 항목을 상단 요약에 노출
- “법령 업데이트 필요” 배너 지원

### P2-3. 저장/백업 방식을 로컬 전용에서 확장

근거:

- `frontend/src/services/storage.ts:15-125` IndexedDB 기반 로컬 저장

권장:

- JSON import/export
- 클라우드 동기화 또는 최소한 백업 파일 저장
- 시나리오 공유 링크

## 7. 권장 구현 순서

1. 결과 라벨 오류, validation 확장, source/mode 표현 오류부터 바로 수정
2. 세금/건보료/세액공제 규칙을 버전 분리
3. 생활비/소득/계좌 유형 중심의 현금흐름 모델 재설계
4. 국민연금/개인연금/퇴직연금 상세 입력 모델 추가
5. bucket/rebalancing 실구현
6. 장수/자산수익률 모델 고도화
7. 보고서/설명/감사추적/백업 기능 추가

## 8. 바로 실행해도 좋은 구체 작업 목록

다음 항목은 바로 이슈/작업 티켓으로 쪼갤 수 있습니다.

- `validation.ts`에 핵심 금액/세율/비율 validator 추가
- `SimpleDashboard.tsx`와 `ReportPrintView.tsx`의 은퇴시점/최종자산 라벨 및 계산값 수정
- `engine.ts`의 historical 결과 표현을 `mode`와 `source` 기준으로 정리
- `engine.ts` 세금/건보료 계산을 별도 모듈로 추출
- `rules/kr/2026.ts` 같은 버전드 규칙 파일 구조 도입
- `SimulationInput`에 계좌 세제 유형과 인출 우선순위 추가
- `bucket` 전략용 실제 잔고 상태와 리필 로직 구현
- 국민연금 상세 입력 폼 추가
- 간편 모드에 생활비/연금/주거 상태 입력 추가
- golden scenario 테스트 세트 추가

## 9. 최종 평가

이 저장소는 버릴 상태가 아니라, 기반이 좋은 편입니다.

다만 지금은 “보여주기 좋은 시뮬레이터” 요소가 “실제로 믿고 쓸 은퇴계산기” 요소보다 더 강합니다.

실사용 전환의 핵심은 기능 개수 추가가 아니라 아래 세 가지입니다.

- 제도 규칙의 버전 관리
- 계좌/소득/지출 중심의 현실적인 현금흐름 모델
- 결과 라벨과 설명의 신뢰성 확보

이 세 축을 먼저 정리하면, 그 다음부터는 고도화 작업이 비교적 안정적으로 이어질 수 있습니다.
