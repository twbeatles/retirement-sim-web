# Modern Web Guidance 적용 계획서

> `modern-web-guidance` 스킬(`search` → `retrieve`)로 조회한 최신 웹 표준 가이드를 이 리포지토리(`frontend/`, React 19 + Tailwind CSS v4)에 적용하기 위한 계획 문서.
> 조회한 가이드 ID: `dialog`, `light-dismiss-a-dialog`, `platform-controls-dismiss-dialog`, `prevent-page-scroll-under-modal-dialog`, `interest-triggered-tooltips`, `responsive-table`, `dark-mode`, `forms`, `slider`, `accessibility` (일부), `performance` (검색 결과 설명 기준).

## 0. 전제 (브라우저 지원 정책)

- 별도 정책 파일이 없으므로 가이드 기본값을 따른다: **Baseline Widely available은 폴백 없이 사용**, 그 외는 점진적 향상(progressive enhancement)으로 적용한다.
- `popover`는 Baseline Newly available(2025-01-27, 전 브라우저 지원)이므로 조건부 폴리필 없이 사용한다.
- `interestfor`/`popover="hint"`/앵커 포지셔닝/`closedby`는 지원이 제한적이므로 **네이티브 우선 + 미지원 브라우저에서도 동작하는 폴백**을 함께 둔다. 추가 npm 의존성(polyfill 패키지)은 이번 계획에 포함하지 않는다.

## 1. 적용 항목 (파일 근거 포함)

### P0-1. 뷰포트 확대 차단 해제 — `frontend/index.html`

- 현황: `maximum-scale=1.0, user-scalable=no` 로 핀치 줌을 막는다. 저시력 사용자의 기본 접근 수단을 차단하므로 `accessibility`/`forms` 가이드 위반이다.
- 조치: `width=device-width, initial-scale=1.0, viewport-fit=cover` 로 변경. iOS 자동 줌 방지는 입력 폰트 `16px` 보장(P0-6)으로 대체한다.

### P0-2. 온보딩 오버레이를 네이티브 `<dialog>` 로 전환 — `frontend/src/components/Onboarding.tsx`

- 현황: `role="dialog"` + 별도 backdrop `div` 로 직접 구현. 배경 클릭 닫기는 있으나 `Esc`/모바일 뒤로가기 닫기, 포커스 격리, 최상위 레이어, 배경 스크롤 잠금이 없다.
- 적용 가이드: `dialog`(Rule 1 모달), `light-dismiss-a-dialog`(`closedby="any"`), `platform-controls-dismiss-dialog`(`showModal()` 사용 시 Esc·뒤로가기 기본 제공), `prevent-page-scroll-under-modal-dialog`(`dialog:modal` + `dialog::backdrop`에 `overscroll-behavior: contain`, `html/body overflow:hidden` 금지).
- 조치:
  - `dialog` + `ref.showModal()` 사용, `closedby="any"`(Safari 폴백: 포인터 press/release가 다이얼로그 바깥일 때만 `close()`).
  - 수동 `role="dialog"`/`aria-modal`/포커스 트랩을 제거하고 `aria-labelledby`로 제목 연결, 주 버튼(`다음`)에 `autofocus`.
  - `close` 이벤트에서 기존 완료 처리(스토리지 기록 + `onComplete`)를 수행해 기존 동작(건너뛰기 포함)을 유지한다.

### P0-3. 도움말 `Tooltip`을 `popover="hint"` 토글팁으로 전환 — `frontend/src/components/Tooltip.tsx`

- 현황: `useState` + hover/click 토글 `div`. 키보드 포커스 진입 지원 없음, `Esc` 닫기 없음, 화면 리더 관계 속성 없음. 사용처 3곳(`BacktestingPanel`, `PortfolioEditor`, `RiskDashboardPanels`) 모두 자식 없는 기본 `?` 트리거다.
- 적용 가이드: `interest-triggered-tooltips`(토글팁 = `interestfor` + `popovertarget="show"` + `popover="hint"`, 트리거 바로 뒤 DOM 배치, `popovertargetaction="show"` 사용).
- 조치:
  - 트리거 `<button interestfor popovertarget="show">`, 본문 `<div popover="hint" role="tooltip">`로 변경. React 19 타입에 없는 속성은 `as any` 스프레드로 전달(스킬 지침 방식).
  - `hint` 미지원 브라우저에서는 클릭(`popovertarget`)으로 열리고 `Esc`/light-dismiss로 닫히는 `auto` 폴백으로 동작한다.
  - 앵커 배치는 `@supports (position-area: ...)` 안에만 `inset: auto`/`margin: 0`을 두어 미지원 브라우저에서 툴팁이 `(0,0)`에 고립되지 않게 한다.

### P0-4. 데이터 테이블 접근성·반응형 보강 — `YearlyReportTable.tsx`, `scenario-comparison/ComparisonResults.tsx`

- 현황: 스크롤 래퍼에 키보드 접근 불가, 테이블 캡션·`scope` 없음, 헤더 sticky 없음. 단순 `overflow-x-auto`만 있다.
- 적용 가이드: `responsive-table`(래퍼 `tabindex="0"` + `role="region"` + 접근 가능한 이름, `<caption>`, `th scope`, sticky 헤더, `@container` 기반 적응).
- 조치:
  - 래퍼에 `tabindex={0}` + `role="region"` + `aria-label`, `<caption className="sr-only">` + `th scope="col/row"` 추가.
  - `thead th`에 `sticky top-0` + 불투명 배경을 주어 세로 스크롤 시 맥락 유지. (카드형 stacked 레이아웃 전환은 P1 후속으로 분리한다.)

### P0-5. 다크모드 네이티브 연동 — `frontend/index.html`, `frontend/src/index.css`, `frontend/src/App.tsx`

- 현황: `data-theme` 속성 기반 토큰 전환은 있으나 `color-scheme` 선언이 없어 스크롤바·폼 컨트롤 등 브라우저 UI가 라이트로 남고, 초기 테마가 OS 설정을 무시한다.
- 적용 가이드: `dark-mode`(`<meta name="color-scheme" content="light dark">` 필수, `:root`에 `color-scheme: light dark` 필수), `dark-mode-toggle`(OS 설정 기본 존중).
- 조치:
  - `index.html`에 `color-scheme` 메타 추가, `index.css` `:root`에 `color-scheme: light dark` 추가.
  - `App.tsx` 테마 초기값을 `matchMedia("(prefers-color-scheme: dark)")`에서 읽고, `documentElement.style.colorScheme`을 `data-theme`와 함께 동기화한다. 수동 토글 버튼은 그대로 둔다.

### P0-6. 폼 라벨 연결·모바일 입력 개선 — `common/UIComponents.tsx`(`Field`), `ui/MoneyInput.tsx`, `ui/InputSlider.tsx`

- 현황: `Field`/`MoneyInput`/`InputSlider` 모두 `<label>`과 `<input>`이 `for`/`id`로 연결되지 않았다. `Field` 입력 폰트가 부모(`text-sm` 등)를 상속해 16px 미만이 될 수 있다(iOS 자동 줌 유발).
- 적용 가이드: `forms`(라벨-컨트롤 `for`/`id` 연결, `font-size: max(1rem, 1em)`, 도움말은 `aria-describedby`로 연결), `slider`(네이티브 유지 + 서식 있는 값은 `aria-valuetext`).
- 조치:
  - `useId()`로 `id` 생성 후 `htmlFor` 연결, `hint`는 `aria-describedby`로 연결.
  - `Field` 입력에 `text-base`(16px) 보장. `MoneyInput`은 이미 `text-lg`이므로 라벨 연결만.
  - `InputSlider`에 `aria-valuetext={displayValue}` 추가. 숫자 입력은 수량(나이·금액·비율)이므로 `type="number"`/`inputMode="numeric"`를 유지한다(가이드의 `type="number"` 회피는 카드번호·우편번호 등 식별자 한정).

### P1-1. 차트·장표 렌더링 성능 — `App.tsx`(lazy 유지), 차트 섹션

- 현황: 차트·리포트는 `lazy` + `requestIdleCallback` 프리페치로 이미 분리되어 있다.
- 적용 가이드: `performance`, `defer-rendering-heavy-content`.
- 조치: 별도 코드 변경 없이 번들 게이트(`perf:gate`)로 회귀를 감시하고, 계획에 명시만 한다. (필요 시 `content-visibility: auto`를 결과 섹션 래퍼에 추가하는 후속 검토.)

### P1-2. 모바일 레이아웃 동적 뷰포트 — `layout/MobileLayout.tsx`

- 현황: `h-[calc(100vh-var(--spacing-header))]` 고정. 모바일 브라우저 주소창 표시/숨김에 따라 높이가 튄다.
- 조치: `supports-[height:100dvh]:h-[calc(100dvh-var(--spacing-header))]` 로 점진 향상한다.

## 2. 이번에 적용하지 않는 항목 (확인済·사유 명시)

| 검토한 가이드/주제 | 미적용 사유 |
|---|---|
| `window.alert`/`window.confirm` → `dialog` 전환 (`fileExchange.ts`, `ScenarioManager.tsx`) | 기존 커밋 테스트(`ScenarioManager.test.tsx`)가 `window.alert` 호출을 명시적으로 단언하므로 현 테스트 계약과 충돌한다. 테스트 갱신은 별도 의사결정이 필요해 이번 계획에서 제외한다. |
| autofill/OTP/결제·주소 폼 가이드 | 인증·결제·주소 수집 폼이 없어 대상 입력이 없다. |
| 날짜·시간대(`Temporal`, `Intl`) 가이드 | 날짜 선택 입력이 없고 `new Date().toLocaleDateString()` 표시만 존재한다. 숫자 기반 나이 입력에는 해당 없다. |
| 살균(DOMPurify 등) | `dangerouslySetInnerHTML` 사용이 없어 주입 지점이 없다. |
| 테이블 카드형 stacked 전환 | 아래 2차 적용에서 `YearlyReportTable`에 컨테이너 쿼리 카드형 전환을 적용했다. |
| `interestfor` 폴리필 패키지 추가 | 의존성 추가 없이 네이티브+폴백으로 동작하도록 설계했으므로 불필요하다. |

## 3. 검증 계획

1. `cd frontend && npm run typecheck`
2. `npm run test -- --run` (특히 `ScenarioManager.test.tsx` — alert 계약 유지 확인)
3. `npm run lint`
4. `npm run build`
5. 수동 확인: 온보딩 다이얼로그(Esc/바깥 클릭 닫기), 툴팁(호버·포커스·클릭·Esc), 테이블 키보드 스크롤, 다크모드 OS 연동, 모바일 핀치 줌.

## 4. 작업 순서

P0-1 → P0-5(CSS/메타) → P0-2 → P0-3 → P0-4 → P0-6 → P0-5(App) → P1-2 → 검증.

## 5. 2차 적용 (2026-11-20 추가 조사분)

- **`forms` + `select-menu-interaction`**: 모든 `<select>`에 접근 가능한 이름 부여. 보이는 라벨이 있으면 `for`/`id` 연결(`WithdrawalControlsSection` 2곳, `GoalPlanner`, `PlanBasicsSection`, `WithdrawalSettings` 2곳), 행(row) 내부처럼 라벨이 없으면 `aria-label`(`BacktestingPanel`, `FavoriteAssets`, `AssetsSection` 3곳, `IncomeStreamsSection`). 같은 파일의 라벨 있는 숫자 입력(`FavoriteAssets` 2곳, `WithdrawalSettings` 세율)도 함께 연결했다.
- **`accessibility`**: `CollapsibleSection` 버튼에 `aria-expanded`/`aria-controls` + `type="button"` 추가, 데코 화살표 `aria-hidden`. `DesktopLayout`/`MobileLayout` 검증 경고 블록에 `role="alert"`(오류)/`role="status"`(경고) 부여 — `SimpleDashboard`는 이미 적용되어 있어서 맞췄다.
- **`motion`**: `motion-reduce:animate-none`(계산 중 표시), `motion-reduce:scroll-auto`(모바일 스크롤), `motion-reduce:transition-none`(접기 패널)으로 모션 감소 선호를 존중한다. 색상 전환은 유지한다.
- **`responsive-table` (후속)**: `YearlyReportTable`에 컨테이너 쿼리 카드형 전환 적용. 600px 미만 컨테이너에서 `thead` 숨김 + 셀별 라벨 주입 + 나이 행헤더 스티키. `@container`를 쓰므로 뷰포트가 아닌 표 자체 너비 기준이다.
- `alert`/`confirm` → `dialog` 전환은 이번에도 제외한다. `ScenarioManager.test.tsx`가 `window.alert` 호출을 계약으로 단언하고 있어, 전환 시 테스트 계약 변경이 필요하기 때문이다. 별도 결정 후 진행한다.
