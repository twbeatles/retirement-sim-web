# 🏦 은퇴 자산 시뮬레이터 Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

> **몬테카를로 시뮬레이션 기반의 한국형 은퇴 자산 설계 도구**

[🇺🇸 English Version](README_EN.md)

---

## ✨ 주요 기능

### 📊 시뮬레이션 엔진
- **몬테카를로 시뮬레이션**: 1,000+ 경로 분석으로 통계적 신뢰도 확보
- **GBM(기하 브라운 운동)**: 자산 성장 모델링
- **상관관계 반영**: 포트폴리오 내 자산 간 상관계수 적용
- **입력 반응형 계산 스케줄러**: 입력 중 빠른 추정(Preview) + 입력 멈춤 후 최종 계산(Full)
- **결과 출처 표기**: `deterministic` / `montecarlo` / `historical`를 요약에 명시
- **은퇴 시점/최종 시점 분리 요약**: `retirementPoint`, `terminalStats`, `depletionStats`, `survivalStats`
- **원장 요약**: 은퇴 초반 12개월 기준 순유입/총지출/세금/건보료/필수생활비 충족률 표시

### 🧭 계획 중심 입력 모델
- **`SimulationPlanV2` 스키마**: `profile`, `accounts`, `incomeStreams`, `expensePlan`, `withdrawalPolicy`, `ruleSet`, `simulationSettings`
- **Guided Intake**: 간편 모드에서도 생활비, 국민연금, 주거 상태, 핵심 자산 입력 유도
- **Plan 편집 UI**: Pro 모드에서 계정/소득/지출 버킷을 직접 편집
- **로컬 규칙 메타데이터**: KR 규칙 버전과 역사 데이터 범위를 결과/리포트에 표시

### 💰 다양한 자산 유형 지원
- **금융 자산**: 주식, 채권, 현금, 대체투자
- **부동산**: 거주용/투자용 부동산, 임대 수익 반영
- **연금**: 국민연금, 개인연금(IRP/연금저축), DC/DB 퇴직연금
- **추가 소득**: 사업 소득, 근로 소득

### 📈 인출 전략 (7가지)
1. **고정 금액**: 매월 동일 금액 인출
2. **고정 비율**: 잔액 대비 일정 비율 인출
3. **4% Rule (SWR)**: 초기 자산 4% + 물가연동
4. **Gap Filler**: 목표 생활비 - 연금 = 인출액
5. **VPW**: 기대수명 기반 가변 인출률
6. **Guardrails**: 시장 상황에 따른 동적 조정
7. **Bucket**: 단기/중기/장기 버킷 기반 인출 안정화

### 📊 역사적 백테스팅 (NEW)
- **40년 역사 데이터**: 1985~2024 실제 시장 수익률 사용
- **롤링 윈도우**: 선택한 시작 연도에 따라 경로 수가 동적으로 계산됨
- **프리셋 시나리오**: 닷컴 버블, 금융위기, 코로나 등

### ⚖️ 자동 리밸런싱 (NEW)
- **주기 옵션**: 월/분기/반기/연간/임계값
- **거래 비용 반영**: 실제 리밸런싱 비용 시뮬레이션
- **세금 효율적 옵션**: 신규 유입 우선의 매수 중심 리밸런싱 근사 모델

### 🎯 역산 계산기 (Goal Planner)
- 목표 금액 → 필요 월 저축액 계산
- 근로소득 모드(`labor_income`) 활성화 시 필요 **저축률(0~100%)** 역산
- 목표 성공률 → 적정 은퇴 나이 계산

### 📱 반응형 UI & 다크모드
- 모바일 최적화된 사이드바
- 시스템 연동 다크모드 지원
- 터치 친화적 슬라이더

---

## 📌 현재 범위와 제약

- 대한민국 단일인 가구 은퇴계산기를 기준으로 설계되어 있습니다.
- 규칙과 역사 데이터는 로컬 버전 자산을 사용하며, 결과 화면에 적용 버전이 표시됩니다.
- 사용자용 인쇄 리포트와 원시 CSV 내보내기를 분리했습니다.
- `bucket` 전략, `tax-efficient rebalancing`, 국민연금 상세 산식, 생명표 기반 장수 모델은 아직 전면 교체 중입니다.
- 현재 최종 계산 경로는 `plan v2 -> legacy input adapter -> engine` 구조를 일부 포함합니다.
- 2026-04-14 리팩토링 기준으로 `AdvancedSettings`, `validation`, `planV2`, `engine`는 내부 책임 기준 폴더 분리가 진행되었습니다.

---

## 🏗️ 프로젝트 구조

```
retirement-sim-web/
├── frontend/
│   ├── src/
│   │   ├── components/           # UI 컴포넌트
│   │   │   ├── Charts/           # 시각화 차트
│   │   │   │   ├── AssetBreakdownChart.tsx
│   │   │   │   ├── CashflowStackChart.tsx
│   │   │   │   ├── FanChart.tsx
│   │   │   │   └── SurvivalChart.tsx
│   │   │   ├── common/           # 공통 UI 컴포넌트
│   │   │   │   └── UIComponents.tsx
│   │   │   ├── layout/           # 반응형 레이아웃
│   │   │   │   ├── DesktopLayout.tsx
│   │   │   │   ├── MobileLayout.tsx
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── sections/
│   │   │   │   └── types.ts
│   │   │   ├── ui/               # 재사용 가능한 UI 요소
│   │   │   │   ├── InputSlider.tsx
│   │   │   │   └── MoneyInput.tsx
│   │   │   ├── advanced-settings/ # 고급 설정 세부 섹션
│   │   │   ├── AdvancedSettings.tsx
│   │   │   ├── BacktestingPanel.tsx  # 역사적 백테스팅 UI
│   │   │   ├── Charts.tsx        # 차트 컨테이너
│   │   │   ├── ExpenseManager.tsx # 지출 관리
│   │   │   ├── FavoriteAssets.tsx # 즐겨찾기 자산
│   │   │   ├── GoalPlanner.tsx   # 역산 계산기
│   │   │   ├── IncomeManager.tsx # 소득 관리
│   │   │   ├── Onboarding.tsx    # 온보딩 위자드
│   │   │   ├── PensionOptimizer.tsx # 연금 최적화
│   │   │   ├── PlanGuidedChecklist.tsx
│   │   │   ├── PlanV2Editor.tsx
│   │   │   ├── PortfolioEditor.tsx
│   │   │   ├── RiskDashboard.tsx
│   │   │   ├── ScenarioComparison.tsx # 시나리오 비교
│   │   │   ├── ScenarioManager.tsx
│   │   │   ├── SimpleDashboard.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── WhatIfSlider.tsx
│   │   │   ├── WithdrawalSettings.tsx
│   │   │   └── YearlyReportTable.tsx
│   │   │
│   │   ├── hooks/                # 커스텀 React 훅
│   │   │   ├── useAutoSimulation.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   └── useSimulation.ts  # 시뮬레이션 상태 관리
│   │   │
│   │   ├── logic/                # 핵심 비즈니스 로직
│   │   │   ├── engine/           # 엔진 보조 컨텍스트/요약/타입
│   │   │   ├── engine.ts         # 시뮬레이션 엔진 진입점
│   │   │   ├── simulation.worker.ts  # Web Worker
│   │   │   ├── workerTypes.ts    # Worker 통신 타입
│   │   │   ├── solver.ts         # 역산 계산 로직
│   │   │   ├── migration.ts      # 구스키마 -> 최신 스키마 변환
│   │   │   ├── riskAnalysis.ts   # 리스크 분석
│   │   │   ├── types.ts          # TypeScript 타입 정의
│   │   │   ├── constants.ts      # 초기값/상수
│   │   │   ├── math.ts           # 수학 함수
│   │   │   ├── planV2/           # 계획 스키마 세부 타입/변환기
│   │   │   ├── planV2.ts         # plan v2 배럴 export
│   │   │   ├── validation/       # 검증 세부 모듈
│   │   │   ├── validation.ts     # 입력값 검증 진입점
│   │   │   ├── historicalData.ts # 역사적 시장 데이터
│   │   │   ├── historicalScenarioMeta.ts # 역사적 시나리오 메타데이터
│   │   │   ├── koreaTax.ts       # 세금 및 연금 수식
│   │   │   ├── planSimulation.ts # plan v2 계산 진입점
│   │   │   ├── rules/
│   │   │   │   └── kr.ts         # KR 규칙/메타데이터
│   │   │   ├── uiConstants.ts
│   │   │   └── export.ts         # 원시 CSV 내보내기
│   │   │
│   │   ├── services/             # 서비스 레이어
│   │   │   └── storage.ts        # IndexedDB 시나리오 저장
│   │   │
│   │   ├── utils/                # 유틸리티 함수
│   │   │   └── format.ts
│   │   │
│   │   ├── App.tsx               # 메인 앱 컴포넌트
│   │   ├── index.css             # 글로벌 스타일 (다크모드 포함)
│   │   └── main.tsx              # 엔트리포인트
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # 문서
│   ├── modeling_notes.md
│   ├── api_examples.md
│   └── roadmap.md
│
├── backup/                       # 백업 파일
├── GEMINI.md                     # AI 컨텍스트 (비즈니스 로직)
├── CLAUDE.md                     # AI 컨텍스트 (개발 가이드)
└── README.md                     # 이 파일
```

---

## 🚀 시작하기

### 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/twbeatles/retirement-sim-web.git
cd retirement-sim-web/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 리팩토링 안전성 검증
npm run verify:refactor

# 린트 + 타입체크 + 테스트 + 빌드
npm run verify:pr
```

---

## 🔧 기술 스택

| 영역 | 기술 |
|------|------|
| **프레임워크** | React 18 + TypeScript |
| **빌드 도구** | Vite |
| **차트** | Recharts |
| **스타일링** | Vanilla CSS (CSS Variables) |
| **상태 관리** | React useState/useEffect |
| **저장소** | IndexedDB (로컬 시나리오) |
| **성능** | Web Workers, Preview→Idle Full 계산, 모듈 지연 로딩 |

---

## 📚 문서

- [GEMINI.md](GEMINI.md) - 시뮬레이션 엔진 비즈니스 로직 상세
- [CLAUDE.md](CLAUDE.md) - 개발자 가이드 및 코드 규칙
- [docs/modeling_notes.md](docs/modeling_notes.md) - 수학적 모델링 노트
- [docs/api_examples.md](docs/api_examples.md) - 최신 입력 스키마/Worker 프로토콜 예시
- [docs/roadmap.md](docs/roadmap.md) - 개발 로드맵
- [docs/retirement_calculator_readiness_review_2026-04-14.md](docs/retirement_calculator_readiness_review_2026-04-14.md) - 실사용 전환 점검 및 개선 현황

---

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조.

---

## 🙏 기여

버그 리포트, 기능 제안, PR을 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Deployment Guide

- [docs/deployment.md](docs/deployment.md) - Netlify, GitHub Pages, Vercel 배포 가이드

---

## Performance Architecture (2026 Refactor)

- Dual worker lanes:
  - `interactive`: preview simulation
  - `compute`: full simulation, batch compare, solver, sensitivity, pension optimization
- Simulation queue policy:
  - latest-wins coalescing by detail level (`preview` / `full`)
  - per-lane queue cap: `inFlight 1 + queued 1`
  - promise fan-out for queued callers
- Auto scheduler:
  - input fingerprint dedupe for preview/full requests
  - skip full simulation while tab is hidden
- Engine/runtime:
  - timeline objects only for sampled paths
  - typed-array accumulation for trajectory/survival stats
- UI rendering:
  - heavy results blocks mount near viewport
  - chart animations disabled for lower first-render cost

---

## 2026-03-01 Stability Update

This release applies all items from `IMPLEMENTATION_RISK_REVIEW_2026-03-01.md` (P0~P2):

- Input safety guard in engine:
  - throw when `end_age <= current_age`
  - throw when `retire_age > end_age`
- Validation policy alignment:
  - `current_age === retire_age` is allowed (`info`)
  - blocking errors stop auto simulation scheduling
- Health insurance detailed mode:
  - `isDependent === true` forces premium to `0`
- Medical shocks:
  - same-month shocks are accumulated (`existing + amount`)
- Inflation sensitivity:
  - `annual_inflation` sensitivity now synchronizes `inflation_scenario.baseRate`
- Assets UI core fields expanded:
  - real estate: `type`, `growthRate`, `rentalYield`, `managementCost`
  - additional pensions: `type`, `monthlyContribution`, `expectedReturn`, `payoutType`, `payoutYears`, `monthlyPayout`
  - business income: `growthRate`, `endAge`
- Historical scenario metadata source-of-truth:
  - duplicate exports removed from `historicalData.ts`

Verification snapshot (2026-03-01):

- `npm run typecheck` passed
- `npm run test -- --run` passed
- `npm run verify:pr` passed

---

## 2026-04-14 Retirement Calculator Update

- `SimulationPlanV2` 저장/편집/JSON export-import 도입
- 결과 요약에 `retirementPoint`, `terminalStats`, `depletionStats`, `survivalStats`, `ruleMetadata`, `assumptionWarnings` 반영
- 역사적 백테스트 결과 `mode: "historical"` 정식 분리
- 은퇴 초반 원장 요약과 필수생활비 충족률 표시
- 원시 CSV와 인쇄 리포트 역할 분리
- 입력 검증 확장: legacy + `plan_v2` 필드 모두 검사
- 로컬 저장소 스키마를 plan v2 기준으로 갱신

Verification snapshot (2026-04-14):

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test -- --run` passed
- `npm run build` passed
