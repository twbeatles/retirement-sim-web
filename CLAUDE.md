# CLAUDE.md

> **Developer Guide**: 이 문서는 은퇴 시뮬레이터의 **코드 구조**, **개발 규칙**, **컴포넌트 가이드**를 정의합니다.

[🇺🇸 English](README_EN.md) | [📊 비즈니스 로직](GEMINI.md)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목표** | 한국형 은퇴 자산 시뮬레이션 도구 |
| **핵심 가치** | 정확성(Monte Carlo), 사용성(간편/전문가 모드), 성능(Web Worker) |
| **기술 스택** | React 18, TypeScript 5, Vite, Recharts |

---

## 2. 디렉토리 구조

```
frontend/src/
├── components/           # React UI 컴포넌트
│   ├── Charts/           # 시각화 차트 (하위 분리)
│   │   ├── AssetBreakdownChart.tsx    # 자산 구성 추이
│   │   ├── CashflowStackChart.tsx     # 현금흐름 스택
│   │   └── SurvivalChart.tsx          # 생존 확률 곡선
│   ├── ui/                   # 재사용 UI 컴포넌트
│   │   ├── InputSlider.tsx       # 슬라이더 입력
│   │   └── MoneyInput.tsx        # 금액 입력
│   ├── AdvancedSettings.tsx   # 고급 설정 (세금, 부채 등)
│   ├── Charts.tsx             # 차트 컨테이너
│   ├── FavoriteAssets.tsx     # 즐겨찾기 자산
│   ├── GoalPlanner.tsx        # 역산 계산기 UI
│   ├── IncomeManager.tsx      # 소득 관리
│   ├── Onboarding.tsx         # 온보딩 위자드
│   ├── PortfolioEditor.tsx    # 포트폴리오 편집기
│   ├── RiskDashboard.tsx      # 리스크 분석 대시보드
│   ├── ScenarioComparison.tsx # 시나리오 비교
│   ├── ScenarioManager.tsx    # 시나리오 저장/불러오기
│   ├── SimpleDashboard.tsx    # 간편 모드 대시보드
│   ├── Tooltip.tsx            # 설명 툴팁 컴포넌트
│   ├── WhatIfSlider.tsx       # What-If 분석 슬라이더
│   ├── WithdrawalSettings.tsx # 인출 전략 설정
│   ├── BacktestingPanel.tsx   # 역사적 백테스팅 UI (Phase 7)
│   └── YearlyReportTable.tsx  # 연도별 리포트 테이블
│
├── hooks/                # 커스텀 React 훅
│   └── useSimulation.ts      # 시뮬레이션 상태 관리 훅
│
├── logic/                # 핵심 비즈니스 로직
│   ├── engine.ts             # 시뮬레이션 엔진 (핵심)
│   ├── simulation.worker.ts  # Web Worker (비동기 처리)
│   ├── workerTypes.ts        # Worker 통신 타입 정의
│   ├── solver.ts             # 역산 계산 (Binary Search)
│   ├── riskAnalysis.ts       # 리스크 분석 함수
│   ├── types.ts              # TypeScript 타입 정의
│   ├── constants.ts          # 초기값/상수
│   ├── math.ts               # 수학 유틸리티 (Box-Muller 등)
│   ├── validation.ts         # 입력값 검증
│   ├── historicalData.ts     # 역사적 시장 데이터 1985~2024 (Phase 7)
│   └── export.ts             # CSV 내보내기
│
├── services/             # 서비스 레이어
│   └── storage.ts            # IndexedDB 시나리오 저장
│
├── App.tsx               # 메인 앱 컴포넌트
├── index.css             # 글로벌 스타일 (CSS Variables, 다크모드)
└── main.tsx              # 엔트리포인트
```

---

## 3. 핵심 규칙

### 3-1. UI/Logic 분리
- `components/`는 **순수 UI 렌더링**만 담당
- `logic/`는 **계산/데이터 처리**만 담당 (React 의존성 없음)
- 상태 관리는 `App.tsx`에서 집중 관리 (lifting state up)

### 3-2. 타입 안전성
- 모든 인터페이스는 `logic/types.ts`에 정의
- `any` 타입 사용 금지
- Optional 필드는 `?` 또는 `undefined` 명시

### 3-3. 성능 최적화
- 무거운 계산은 Web Worker (`simulation.worker.ts`) 사용
- `useMemo`/`useEffect`의 의존성 배열 정확히 명시
- 불필요한 리렌더링 방지 (`React.memo` 적절히 사용)

### 3-4. CSS 규칙
- CSS Variables 우선 사용 (`--primary`, `--bg-card` 등)
- 다크모드: `[data-theme='dark']` 셀렉터로 오버라이드
- 반응형: `@media (max-width: 768px)` 모바일 대응

---

## 4. 주요 컴포넌트 가이드

### 4-1. App.tsx (메인)
```typescript
// 핵심 상태
const [input, setInput] = useState<SimulationInput>(INITIAL_INPUT);
const [result, setResult] = useState<SimulationResult | null>(null);
const [theme, setTheme] = useState<'light' | 'dark'>('light');

// Web Worker 통합
const workerRef = useRef<Worker | null>(null);
useEffect(() => {
  workerRef.current = new Worker(
    new URL('./logic/simulation.worker.ts', import.meta.url),
    { type: 'module' }
  );
  // ...
}, []);
```

### 4-2. engine.ts (시뮬레이션 엔진)
```typescript
// 핵심 함수
runSimulation(input: SimulationInput): SimulationResult
simulateOnePath(ctx: SimulationContext): { timeline, depleted, depletionAge }
calculatePortfolioMetrics(portfolio): { ret, vol, totalAlloc }
```

### 4-3. storage.ts (IndexedDB)
```typescript
// ScenarioStorage 클래스
saveScenario(name, input): Promise<number>
getAllScenarios(): Promise<SavedScenario[]>
deleteScenario(id): Promise<void>
```

---

## 5. 스타일 가이드 (CSS)

### 5-1. 컬러 변수
```css
:root {
  --primary: #2563eb;
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --border: #e2e8f0;
}

[data-theme='dark'] {
  --bg-main: #0f172a;
  --bg-card: #1e293b;
  --text-main: #f1f5f9;
  /* ... */
}
```

### 5-2. 주요 클래스
| 클래스 | 용도 |
|--------|------|
| `.card` | 카드 컨테이너 |
| `.btn`, `.btn-primary` | 버튼 스타일 |
| `.input`, `.select` | 폼 요소 |
| `.summary-card` | 요약 카드 |
| `.grid-2-cols` | 2열 그리드 |
| `.flex-row`, `.flex-col` | 플렉스 레이아웃 |

---

## 6. 개발 워크플로우

### 6-1. 로컬 개발
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

### 6-2. 빌드 & 테스트
```bash
npm run build   # dist/ 폴더에 프로덕션 빌드
npm run preview # 빌드 결과 미리보기
```

### 6-3. 파일 수정 시 체크리스트
- [ ] `types.ts`에 새 타입 정의했는가?
- [ ] `constants.ts`에 초기값 추가했는가?
- [ ] `INITIAL_INPUT` 업데이트했는가?
- [ ] 빌드 에러 없는가? (`npm run build`)

---

## 7. 향후 개선 사항 (TODO)

- [ ] 다국어 지원 (i18n)
- [ ] 통화 선택 (KRW/USD)
- [ ] PWA 오프라인 지원
- [ ] 테스트 코드 추가 (Vitest)
- [ ] Storybook 컴포넌트 문서화
