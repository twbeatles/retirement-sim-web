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

### 💰 다양한 자산 유형 지원
- **금융 자산**: 주식, 채권, 현금, 대체투자
- **부동산**: 거주용/투자용 부동산, 임대 수익 반영
- **연금**: 국민연금, 개인연금(IRP/연금저축), DC/DB 퇴직연금
- **추가 소득**: 사업 소득, 근로 소득

### 📈 인출 전략 (6가지)
1. **고정 금액**: 매월 동일 금액 인출
2. **고정 비율**: 잔액 대비 일정 비율 인출
3. **4% Rule (SWR)**: 초기 자산 4% + 물가연동
4. **Gap Filler**: 목표 생활비 - 연금 = 인출액
5. **VPW**: 기대수명 기반 가변 인출률
6. **Guardrails**: 시장 상황에 따른 동적 조정

### 📊 역사적 백테스팅 (NEW)
- **40년 역사 데이터**: 1985~2024 실제 시장 수익률 사용
- **롤링 윈도우**: 20개 시나리오 자동 테스트
- **프리셋 시나리오**: 닷컴 버블, 금융위기, 코로나 등

### ⚖️ 자동 리밸런싱 (NEW)
- **주기 옵션**: 월/분기/반기/연간/임계값
- **거래 비용 반영**: 실제 리밸런싱 비용 시뮬레이션
- **세금 효율적 옵션**: 매수만으로 리밸런싱

### 🎯 역산 계산기 (Goal Planner)
- 목표 금액 → 필요 월 저축액 계산
- 목표 성공률 → 적정 은퇴 나이 계산

### 📱 반응형 UI & 다크모드
- 모바일 최적화된 사이드바
- 시스템 연동 다크모드 지원
- 터치 친화적 슬라이더

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
│   │   │   │   └── SurvivalChart.tsx
│   │   │   ├── ui/               # 재사용 가능한 UI 컴포넌트
│   │   │   │   ├── InputSlider.tsx
│   │   │   │   └── MoneyInput.tsx
│   │   │   ├── AdvancedSettings.tsx
│   │   │   ├── Charts.tsx        # 차트 컨테이너
│   │   │   ├── FavoriteAssets.tsx # 즐겨찾기 자산
│   │   │   ├── GoalPlanner.tsx   # 역산 계산기
│   │   │   ├── IncomeManager.tsx
│   │   │   ├── Onboarding.tsx    # 온보딩 위자드
│   │   │   ├── PortfolioEditor.tsx
│   │   │   ├── RiskDashboard.tsx
│   │   │   ├── ScenarioComparison.tsx # 시나리오 비교
│   │   │   ├── ScenarioManager.tsx
│   │   │   ├── SimpleDashboard.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── WhatIfSlider.tsx
│   │   │   ├── WithdrawalSettings.tsx
│   │   │   ├── BacktestingPanel.tsx  # 역사적 백테스팅 UI
│   │   │   └── YearlyReportTable.tsx
│   │   │
│   │   ├── hooks/                # 커스텀 React 훅
│   │   │   └── useSimulation.ts  # 시뮬레이션 상태 관리
│   │   │
│   │   ├── logic/                # 핵심 비즈니스 로직
│   │   │   ├── engine.ts         # 시뮬레이션 엔진
│   │   │   ├── simulation.worker.ts  # Web Worker
│   │   │   ├── workerTypes.ts    # Worker 통신 타입
│   │   │   ├── solver.ts         # 역산 계산 로직
│   │   │   ├── riskAnalysis.ts   # 리스크 분석
│   │   │   ├── types.ts          # TypeScript 타입 정의
│   │   │   ├── constants.ts      # 초기값/상수
│   │   │   ├── math.ts           # 수학 함수
│   │   │   ├── validation.ts     # 입력값 검증
│   │   │   ├── historicalData.ts # 역사적 시장 데이터 (1985~2024)
│   │   │   └── export.ts         # CSV 내보내기
│   │   │
│   │   ├── services/             # 서비스 레이어
│   │   │   └── storage.ts        # IndexedDB 시나리오 저장
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
git clone https://github.com/your-repo/retirement-sim-web.git
cd retirement-sim-web/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
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
| **성능** | Web Workers |

---

## 📚 문서

- [GEMINI.md](GEMINI.md) - 시뮬레이션 엔진 비즈니스 로직 상세
- [CLAUDE.md](CLAUDE.md) - 개발자 가이드 및 코드 규칙
- [docs/modeling_notes.md](docs/modeling_notes.md) - 수학적 모델링 노트
- [docs/roadmap.md](docs/roadmap.md) - 개발 로드맵

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
