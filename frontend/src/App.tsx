import React, { useMemo, useState, useEffect } from "react";
import { useSimulation } from "./hooks/useSimulation";

// runSimulation moved to worker
// import { runSimulation } from "./logic/engine";
import type { SimulationInput, SimulationResult, ValidationWarning } from "./logic/types";
import { INITIAL_INPUT } from "./logic/constants";
import { validateSimulationInput } from "./logic/validation";
import { exportSimulationResult } from "./logic/export";
import { AssetChart, RetirementCashflowChart, FanChart, AssetBreakdownChart, CashflowStackChart, SurvivalChart } from "./components/Charts";
import { YearlyReportTable } from "./components/YearlyReportTable";
import { PortfolioEditor } from "./components/PortfolioEditor";
import { WithdrawalSettings } from "./components/WithdrawalSettings";
import { ScenarioManager } from "./components/ScenarioManager";
import { AdvancedSettings } from "./components/AdvancedSettings";
import { RiskDashboard } from "./components/RiskDashboard";
import { ScenarioComparison } from "./components/ScenarioComparison";
import { WhatIfSlider } from "./components/WhatIfSlider";
import { Onboarding } from "./components/Onboarding";
import { FavoriteAssets } from "./components/FavoriteAssets";
import { SimpleDashboard } from "./components/SimpleDashboard";
import { IncomeManager } from "./components/IncomeManager";
import { GoalPlanner } from "./components/GoalPlanner";
import { BacktestingPanel } from "./components/BacktestingPanel";

function num(v: string) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Sidebar Tab Configuration
const SIDEBAR_TABS = [
  { id: 'basic', label: '기본 정보', icon: '📋' },
  { id: 'assets', label: '자산 관리', icon: '💰' },
  { id: 'pension', label: '연금 설정', icon: '🏦' },
  { id: 'goal', label: '목표 설계', icon: '🎯' },
  { id: 'advanced', label: '고급 설정', icon: '⚙️' },
];

export default function App() {
  const [input, setInput] = useState<SimulationInput>(INITIAL_INPUT);
  // const [result, setResult] = useState<SimulationResult | null>(null); // Managed by hook

  const [analysisTab, setAnalysisTab] = useState<'charts' | 'risk' | 'compare' | 'whatif'>('charts');
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');
  const [sidebarTab, setSidebarTab] = useState('basic');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Mobile Responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Input Validation
  const validationWarnings = useMemo<ValidationWarning[]>(() => {
    return validateSimulationInput(input);
  }, [input]);

  // Use custom hook for simulation
  const { runSimulation, isCalculating, result } = useSimulation();

  // Debounced simulation run
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation(input);
    }, 400);

    return () => clearTimeout(timer);
  }, [input, runSimulation]);


  const timeline = useMemo(() => {
    if (!result) return [];
    if (result.mode === "deterministic") return result.timeline;
    return result.sampleTimelines[0] || [];
  }, [result]);

  const summary = result?.summary;

  return (
    <div className="app-container">
      <header className="header">
        <div className="flex-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
          {isMobile && viewMode === 'pro' && (
            <button
              className="btn-icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ fontSize: '1.2rem', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ☰
            </button>
          )}
          <div className="brand">
            <span>📈</span> 은퇴 자산 시뮬레이터 Pro
            {isCalculating && <span className="text-xs text-muted ml-2 animate-pulse">Running...</span>}
          </div>
        </div>

        <div className="flex-row" style={{ gap: '1rem', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={viewMode === 'simple' ? 'active' : ''}
              onClick={() => {
                setViewMode('simple');
                setIsSidebarOpen(false);
              }}
            >
              🐣 간편 모드
            </button>
            <button
              className={viewMode === 'pro' ? 'active' : ''}
              onClick={() => {
                setViewMode('pro');
                if (!isMobile) setIsSidebarOpen(true);
              }}
            >
              🦅 전문가 모드
            </button>
          </div>
          <button
            className="btn-icon"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? "다크 모드 켜기" : "라이트 모드 켜기"}
            style={{ fontSize: '1.2rem', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header >

      {viewMode === 'simple' ? (
        <div className="simple-mode-container">
          <SimpleDashboard input={input} result={result} onInputChange={setInput} />
        </div>
      ) : (
        <>
          {/* Sidebar: Settings with Tabs */}
          {/* Mobile Overlay */}
          {isMobile && isSidebarOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setIsSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90
              }}
            />
          )}

          <aside className={`sidebar ${isMobile ? 'mobile' : ''} ${isSidebarOpen ? 'open' : ''}`}>
            {/* Sidebar Tab Navigation */}
            <div className="sidebar-tabs">
              {SIDEBAR_TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
                  onClick={() => setSidebarTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Scenario Manager - Always visible */}
            <ScenarioManager currentInput={input} onLoad={setInput} />

            {/* Tab Content */}
            <div className="sidebar-content">
              {sidebarTab === 'basic' && (
                <div className="animate-fadeIn">
                  <Section title="📋 기본 설정">
                    <div className="grid-2-cols">
                      <Field label="현재 나이" value={input.current_age} onChange={v => setInput({ ...input, current_age: num(v) })} suffix="세" />
                      <Field label="은퇴 나이" value={input.retire_age} onChange={v => setInput({ ...input, retire_age: num(v) })} suffix="세" />
                      <Field label="종료 나이" value={input.end_age} onChange={v => setInput({ ...input, end_age: num(v) })} suffix="세" />
                      <Field label="물가상승률" step="0.1" value={input.annual_inflation * 100} onChange={v => setInput({ ...input, annual_inflation: num(v) / 100 })} suffix="%" />
                    </div>
                  </Section>

                  <Section title="🎯 시뮬레이션 설정">
                    <div className="grid-2-cols">
                      <Field
                        label="시뮬레이션 횟수"
                        value={input.simulation_settings.mc_paths}
                        onChange={v => setInput({
                          ...input,
                          simulation_settings: { ...input.simulation_settings, mc_paths: num(v) }
                        })}
                        suffix="회"
                      />
                    </div>
                    <p className="text-xs text-muted mt-2">
                      💡 1,000회 이상 권장. 높을수록 정확하지만 계산 시간이 길어집니다.
                    </p>
                  </Section>
                </div>
              )}

              {sidebarTab === 'assets' && (
                <div className="animate-fadeIn">
                  <Section title="💵 현재 자산">
                    <div className="grid-2-cols">
                      <Field
                        label="현재 자산(저축/투자)"
                        value={Math.round(input.general.current_balance / 10000)}
                        onChange={v => setInput({ ...input, general: { ...input.general, current_balance: num(v) * 10000 } })}
                        suffix="만원"
                      />
                      {!input.labor_income?.enabled && (
                        <Field
                          label="월 저축액"
                          value={Math.round(input.general.monthly_contribution / 10000)}
                          onChange={v => setInput({ ...input, general: { ...input.general, monthly_contribution: num(v) * 10000 } })}
                          suffix="만원"
                        />
                      )}
                    </div>
                  </Section>

                  <IncomeManager input={input} onChange={setInput} />
                  <PortfolioEditor
                    portfolio={input.portfolio}
                    onChange={(p) => setInput({ ...input, portfolio: p })}
                  />
                </div>
              )}

              {sidebarTab === 'pension' && (
                <div className="animate-fadeIn">
                  <Section title="🏛️ 국민연금">
                    <Field
                      label="은퇴 시 예상 월 수령액"
                      value={Math.round((input.national_pension.expected_monthly_benefit_at_retirement || 0) / 10000)}
                      onChange={v => setInput({ ...input, national_pension: { ...input.national_pension, expected_monthly_benefit_at_retirement: num(v) * 10000 } })}
                      suffix="만원"
                    />
                    <Field
                      label="수령 개시 연령"
                      value={input.national_pension.startAge ?? 65}
                      onChange={v => setInput({ ...input, national_pension: { ...input.national_pension, startAge: num(v) } })}
                      suffix="세"
                    />
                    <div className="info-box">
                      <span className="info-icon">💡</span>
                      <span>65세 기준: 조기수령 -6%/년, 연기수령 +7.2%/년 자동 적용</span>
                    </div>
                    <div className="mt-3">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={input.national_pension.inflation_linked}
                          onChange={e => setInput({ ...input, national_pension: { ...input.national_pension, inflation_linked: e.target.checked } })}
                        />
                        물가연동 적용
                      </label>
                    </div>
                  </Section>

                  <Section title="💼 개인연금 (연금저축/IRP)">
                    <div className="grid-2-cols">
                      <Field
                        label="현재 잔고"
                        value={Math.round(input.private_pension.current_balance / 10000)}
                        onChange={v => setInput({ ...input, private_pension: { ...input.private_pension, current_balance: num(v) * 10000 } })}
                        suffix="만원"
                      />
                      <Field
                        label="월 납입액"
                        value={Math.round(input.private_pension.monthly_contribution / 10000)}
                        onChange={v => setInput({ ...input, private_pension: { ...input.private_pension, monthly_contribution: num(v) * 10000 } })}
                        suffix="만원"
                      />
                      <Field
                        label="예상 수익률"
                        step="0.5"
                        value={input.private_pension.annual_return * 100}
                        onChange={v => setInput({ ...input, private_pension: { ...input.private_pension, annual_return: num(v) / 100 } })}
                        suffix="%"
                      />
                      <Field
                        label="연금 수령기간"
                        value={input.private_pension.payout_years}
                        onChange={v => setInput({ ...input, private_pension: { ...input.private_pension, payout_years: num(v) } })}
                        suffix="년"
                      />
                    </div>
                  </Section>
                </div>
              )}

              {sidebarTab === 'goal' && (
                <div className="animate-fadeIn">
                  <GoalPlanner input={input} onApply={setInput} />
                </div>
              )}

              {sidebarTab === 'advanced' && (
                <div className="animate-fadeIn">
                  <BacktestingPanel input={input} onInputChange={setInput} />
                  <WithdrawalSettings
                    withdrawal={input.withdrawal}
                    onChange={w => setInput({ ...input, withdrawal: w })}
                  />

                  <Section title="⚠️ 리스크 관리 (Stress Test)">
                    <label className="checkbox-label font-semibold">
                      <input
                        type="checkbox"
                        checked={input.stress_test?.enabled ?? false}
                        onChange={e => setInput({ ...input, stress_test: { ...(input.stress_test ?? { startFromRetirement: true, durationMonths: 24, annualDeclineRate: 0.2 }), enabled: e.target.checked } })}
                      />
                      시장 폭락 시뮬레이션 적용
                    </label>
                    {input.stress_test?.enabled && (
                      <div className="stress-test-box mt-3">
                        <div className="text-xs text-danger mb-2">
                          * 주식 시장이 특정 기간 동안 매년 폭락한다고 가정합니다.
                        </div>
                        <div className="grid-2-cols">
                          <Field
                            label="연간 하락률"
                            step="5"
                            value={input.stress_test.annualDeclineRate * 100}
                            onChange={v => setInput({ ...input, stress_test: { ...input.stress_test!, annualDeclineRate: num(v) / 100 } })}
                            suffix="%"
                          />
                          <Field
                            label="지속 기간"
                            value={input.stress_test.durationMonths}
                            onChange={v => setInput({ ...input, stress_test: { ...input.stress_test!, durationMonths: num(v) } })}
                            suffix="개월"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="checkbox-label text-sm">
                            <input
                              type="checkbox"
                              checked={input.stress_test.startFromRetirement}
                              onChange={e => setInput({ ...input, stress_test: { ...input.stress_test!, startFromRetirement: e.target.checked } })}
                            />
                            은퇴 시점부터 발생 (수익률 순서 위험)
                          </label>
                        </div>
                      </div>
                    )}
                  </Section>

                  <AdvancedSettings input={input} onChange={setInput} />
                  <FavoriteAssets
                    portfolio={input.portfolio}
                    onChange={(p) => setInput({ ...input, portfolio: p })}
                  />
                </div>
              )}
            </div>

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <div className="validation-warnings">
                <h4 className="warning-header">⚠️ 입력값 확인</h4>
                {validationWarnings.map((w, i) => (
                  <div key={i} className={`warning-item ${w.severity}`}>
                    {w.message}
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Onboarding Modal */}
          <Onboarding />

          {/* Main Content: Results */}
          <main className="main-content">
            {/* Summary Cards */}
            {summary && (
              <div className="summary-grid">
                <SummaryCard
                  title="은퇴 성공 확률"
                  value={(summary.successRate * 100).toFixed(1) + "%"}
                  desc={`${input.end_age}세까지 자산 유지 (${input.simulation_settings.mc_paths}회 시뮬레이션)`}
                  color={summary.successRate > 0.8 ? "var(--success)" : summary.successRate > 0.5 ? "var(--warning)" : "var(--danger)"}
                />
                <SummaryCard
                  title="은퇴 시 자산 (중위값)"
                  value={formatMoney(summary.mc?.totalAssetsReal.p50 || 0)}
                  desc="현재 가치 기준 (물가 반영)"
                />
                <SummaryCard
                  title="최종 자산 잔존 (중위값)"
                  value={formatMoney(summary.mc?.totalAssetsReal.mean || 0)}
                  desc={`${input.end_age}세 시점 예상 잔고`}
                />
              </div>
            )}

            {/* Export Button */}
            {result && (
              <div className="text-right">
                <button
                  className="btn btn-secondary"
                  onClick={() => exportSimulationResult(result)}
                >
                  💾 결과 다운로드 (CSV)
                </button>
              </div>
            )}

            {/* Charts */}
            <div className="card">
              <h3 className="card-header">📊 자산 생존 확률 (Survival Analysis)</h3>
              <p className="text-sub text-sm mb-4">
                은퇴 후 나이가 들면서 자산이 남아있을 확률을 보여줍니다. (몬테카를로 분석)
              </p>
              {result ? (
                <SurvivalChart result={result} />
              ) : (
                <div className="text-center text-muted py-8">시뮬레이션 결과를 기다리는 중...</div>
              )}
            </div>

            <div className="card">
              <h3 className="card-header">📈 자산 구성 추이</h3>
              <p className="text-sub text-sm mb-4">
                부동산, 연금, 일반 자산이 어떻게 변화하는지 보여줍니다.
              </p>
              {result?.mode === 'deterministic' ? (
                <AssetBreakdownChart data={timeline} />
              ) : result?.mode === 'montecarlo' && result.trajectoryStats ? (
                <FanChart stats={result.trajectoryStats} />
              ) : (
                <div className="text-center text-muted py-8">시뮬레이션 결과를 기다리는 중...</div>
              )}
            </div>

            <div className="card">
              <h3 className="card-header">💵 은퇴 후 현금 흐름 (Income vs Spending)</h3>
              <p className="text-sub text-sm mb-4">
                연금 소득과 자산 인출이 생활비를 어떻게 충당하는지 보여줍니다.
              </p>
              <CashflowStackChart data={timeline} />
            </div>

            <div className="card">
              <h3 className="card-header">📋 연도별 상세 리포트</h3>
              <YearlyReportTable data={timeline} />
            </div>

            {/* Analysis Tabs */}
            <div className="card">
              <div className="tabs">
                {[
                  { id: 'risk', label: '📊 리스크 분석' },
                  { id: 'compare', label: '📈 시나리오 비교' },
                  { id: 'whatif', label: '🎚️ What-If' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalysisTab(tab.id as any)}
                    className={`tab ${analysisTab === tab.id ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {analysisTab === 'risk' && (
                <RiskDashboard input={input} result={result} onInputChange={setInput} />
              )}
              {analysisTab === 'compare' && (
                <ScenarioComparison currentInput={input} currentResult={result} />
              )}
              {analysisTab === 'whatif' && (
                <WhatIfSlider input={input} onInputChange={setInput} />
              )}
            </div>

            <footer className="footer">
              <p>
                본 시뮬레이션은 가정에 기반한 단순 예측이며, 실제 미래 수익률을 보장하지 않습니다.
                <br />
                모든 계산은 브라우저 내에서 수행되며, 서버로 데이터가 전송되지 않습니다.
              </p>
            </footer>
          </main>
        </>
      )
      }

      <style>{`
        /* Sidebar Tabs */
        .sidebar-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-xs);
          padding: var(--space-sm);
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-md);
          box-shadow: var(--shadow-xs);
        }
        .sidebar-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: var(--space-sm);
          background: transparent;
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .sidebar-tab:hover {
          background: var(--bg-hover);
        }
        .sidebar-tab.active {
          background: var(--primary-light);
        }
        .tab-icon {
          font-size: 1.25rem;
        }
        .tab-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-sub);
        }
        .sidebar-tab.active .tab-label {
          color: var(--primary);
        }

        .sidebar-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        /* Info Box */
        .info-box {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--primary-light);
          border-radius: var(--radius);
          font-size: 0.8rem;
          color: var(--primary-dark);
          margin-top: var(--space-sm);
        }
        .info-icon {
          flex-shrink: 0;
        }

        /* Validation Warnings */
        .validation-warnings {
          padding: var(--space-md);
          background: var(--warning-bg);
          border-radius: var(--radius);
          border-left: 4px solid var(--warning);
          margin-top: var(--space-md);
        }
        .warning-header {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--warning);
          margin: 0 0 var(--space-sm) 0;
        }
        .warning-item {
          padding: var(--space-sm);
          margin-bottom: var(--space-xs);
          border-radius: var(--radius);
          font-size: 0.8rem;
        }
        .warning-item.error {
          background: var(--danger-light);
          color: var(--danger);
        }
        .warning-item.warning {
          background: var(--warning-light);
          color: var(--warning);
        }
        .warning-item.info {
          background: var(--bg-main);
          color: var(--text-main);
        }

        .mt-3 {
          margin-top: var(--space-md);
        }

        /* Responsive Sidebar Styles */
        aside.sidebar.mobile {
            position: fixed;
            top: 60px; /* Header height */
            left: 0;
            bottom: 0;
            width: 85%;
            max-width: 320px;
            z-index: 100;
            background: var(--bg-main);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: var(--shadow-xl);
            padding: var(--space-md);
            overflow-y: auto;
        }
        
        aside.sidebar.mobile.open {
            transform: translateX(0);
        }

        @media (max-width: 768px) {
            .app-container {
                grid-template-columns: 1fr !important; /* Force stack */
            }
            .sidebar:not(.mobile) {
                display: none; /* Hide default sidebar on mobile */
            }
            .header {
                padding: 0 1rem;
            }
            .brand {
                font-size: 1rem;
            }
            .view-toggle button {
                padding: 4px 8px;
                font-size: 0.8rem;
            }
        }
      `}</style>
    </div >
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="card-header">{title}</h3>
      {children}
    </div>
  );
}

function Field(props: { label: string; value: any; step?: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="input-group">
      <label className="label">{props.label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          className="input"
          type="number"
          value={props.value}
          step={props.step}
          onChange={(e) => props.onChange(e.target.value)}
          style={{ paddingRight: props.suffix ? '45px' : undefined }}
        />
        {props.suffix && (
          <span style={{
            position: 'absolute',
            right: '12px',
            color: 'var(--text-sub)',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}>
            {props.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, desc, color }: { title: string; value: string; desc: string; color?: string }) {
  return (
    <div className="summary-card" style={{ borderLeftColor: color }}>
      <div className="summary-title">{title}</div>
      <div className="summary-value" style={{ color: color }}>{value}</div>
      <div className="summary-desc">{desc}</div>
    </div>
  );
}

function formatMoney(value: number): string {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(1) + '억원';
  }
  return Math.round(value / 10000).toLocaleString() + '만원';
}
