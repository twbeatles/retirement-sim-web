import React, { useState, useMemo } from 'react';
import type { SimulationInput, SimulationResult, ValidationWarning } from '../../logic/types';
import { exportSimulationResult } from '../../logic/export';
import { AssetChart, RetirementCashflowChart, FanChart, AssetBreakdownChart, CashflowStackChart, SurvivalChart } from '../Charts';
import { YearlyReportTable } from '../YearlyReportTable';
import { PortfolioEditor } from '../PortfolioEditor';
import { WithdrawalSettings } from '../WithdrawalSettings';
import { ScenarioManager } from '../ScenarioManager';
import { AdvancedSettings } from '../AdvancedSettings';
import { RiskDashboard } from '../RiskDashboard';
import { ScenarioComparison } from '../ScenarioComparison';
import { WhatIfSlider } from '../WhatIfSlider';
import { FavoriteAssets } from '../FavoriteAssets';
import { IncomeManager } from '../IncomeManager';
import { GoalPlanner } from '../GoalPlanner';
import { BacktestingPanel } from '../BacktestingPanel';
import { Section, Field, SummaryCard } from '../common/UIComponents';
import { SIDEBAR_TABS, AnalysisTabType, ANALYSIS_TABS } from '../../logic/uiConstants';
import { formatMoney, num } from '../../utils/format';

interface MobileLayoutProps {
    input: SimulationInput;
    setInput: (input: SimulationInput) => void;
    result: SimulationResult | null;
    validationWarnings: ValidationWarning[];
    sidebarTab: string;
    setSidebarTab: (tab: string) => void;
    analysisTab: AnalysisTabType;
    setAnalysisTab: (tab: AnalysisTabType) => void;
}

export function MobileLayout({
    input,
    setInput,
    result,
    validationWarnings,
    sidebarTab,
    setSidebarTab,
    analysisTab,
    setAnalysisTab
}: MobileLayoutProps) {

    // Local state for mobile navigation (includes 'results')
    // We initialize with sidebarTab, defaulting to 'basic'
    const [activeTab, setActiveTab] = useState<string>(sidebarTab || 'basic');

    const timeline = useMemo(() => {
        if (!result) return [];
        if (result.mode === "deterministic") return result.timeline;
        return result.sampleTimelines[0] || [];
    }, [result]);

    const summary = result?.summary;

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        // If it's an input tab, sync with parent sidebarTab state
        if (tabId !== 'results') {
            setSidebarTab(tabId);
        }
    };

    const isInputTab = activeTab !== 'results';

    return (
        <div className="mobile-layout">
            {/* Main Content Area */}
            <div className="mobile-content pb-safe">

                {/* Scenario Manager - Visible on Input Tabs */}
                {isInputTab && (
                    <div className="p-3 bg-card border-b border-border mb-3">
                        <ScenarioManager currentInput={input} onLoad={setInput} />
                    </div>
                )}

                {/* Input Tabs Content */}
                {activeTab === 'basic' && (
                    <div className="p-3 animate-fadeIn space-y-3">
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

                {activeTab === 'assets' && (
                    <div className="p-3 animate-fadeIn space-y-3">
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

                {activeTab === 'pension' && (
                    <div className="p-3 animate-fadeIn space-y-3">
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

                {activeTab === 'goal' && (
                    <div className="p-3 animate-fadeIn">
                        <GoalPlanner input={input} onApply={setInput} />
                    </div>
                )}

                {activeTab === 'advanced' && (
                    <div className="p-3 animate-fadeIn space-y-3">
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

                {/* Validation Warnings for Input Tabs */}
                {isInputTab && validationWarnings.length > 0 && (
                    <div className="validation-warnings m-3">
                        <h4 className="warning-header">⚠️ 입력값 확인</h4>
                        {validationWarnings.map((w, i) => (
                            <div key={i} className={`warning-item ${w.severity}`}>
                                {w.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* RESULTS TAB */}
                {activeTab === 'results' && (
                    <div className="p-3 animate-fadeIn space-y-4">
                        {summary ? (
                            <div className="summary-grid">
                                <SummaryCard
                                    title="은퇴 성공 확률"
                                    value={(summary.successRate * 100).toFixed(1) + "%"}
                                    desc={`${input.end_age}세까지 자산 유지`}
                                    color={summary.successRate > 0.8 ? "var(--success)" : summary.successRate > 0.5 ? "var(--warning)" : "var(--danger)"}
                                />
                                <SummaryCard
                                    title="은퇴 시 자산 (중위값)"
                                    value={formatMoney(summary.mc?.totalAssetsReal.p50 || 0)}
                                    desc="현재 가치 기준"
                                />
                                <SummaryCard
                                    title="최종 자산 잔존 (중위값)"
                                    value={formatMoney(summary.mc?.totalAssetsReal.mean || 0)}
                                    desc={`${input.end_age}세 시점 예상 잔고`}
                                />
                            </div>
                        ) : (
                            <div className="p-4 text-center text-muted">결과 계산 중...</div>
                        )}

                        {result && (
                            <div className="text-right">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => exportSimulationResult(result)}
                                >
                                    💾 CSV 저장
                                </button>
                            </div>
                        )}

                        <div className="card">
                            <h3 className="card-header">📊 자산 생존 확률</h3>
                            {result ? <SurvivalChart result={result} /> : <div>로딩중...</div>}
                        </div>

                        <div className="card">
                            <h3 className="card-header">📈 자산 구성 추이</h3>
                            {result?.mode === 'deterministic' ? (
                                <AssetBreakdownChart data={timeline} />
                            ) : result?.mode === 'montecarlo' && result.trajectoryStats ? (
                                <FanChart stats={result.trajectoryStats} />
                            ) : (
                                <div>로딩중...</div>
                            )}
                        </div>

                        <div className="card">
                            <h3 className="card-header">💵 현금 흐름</h3>
                            <CashflowStackChart data={timeline} />
                        </div>

                        <div className="card">
                            <h3 className="card-header">📋 연도별 상세</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <YearlyReportTable data={timeline} />
                            </div>
                        </div>

                        <div className="card">
                            <div className="tabs">
                                {ANALYSIS_TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setAnalysisTab(tab.id)}
                                        className={`tab ${analysisTab === tab.id ? 'active' : ''}`}
                                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3">
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
                        </div>

                        <div className="h-16"></div> {/* Spacer for bottom nav */}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                {SIDEBAR_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        <span className="nav-icon">{tab.icon}</span>
                        <span className="nav-label">{tab.label}</span>
                    </button>
                ))}
                <button
                    className={`nav-item ${activeTab === 'results' ? 'active' : ''} result-tab`}
                    onClick={() => handleTabChange('results')}
                >
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">리포트</span>
                </button>
            </nav>

            <style>{`
        .mobile-layout {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: var(--bg-main);
        }
        .pb-safe {
            padding-bottom: 80px; /* Space for bottom nav */
        }
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-card);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-around;
            padding: 8px 4px;
            padding-bottom: max(8px, env(safe-area-inset-bottom));
            z-index: 100;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            padding: 4px;
            flex: 1;
            cursor: pointer;
            color: var(--text-sub);
            transition: color 0.2s;
        }
        .nav-item.active {
            color: var(--primary);
        }
        .nav-icon {
            font-size: 1.2rem;
            margin-bottom: 2px;
        }
        .nav-label {
            font-size: 0.65rem;
            font-weight: 500;
        }
        .result-tab.active {
            color: var(--secondary); /* Distinct color for results? Or stick to primary */
            color: var(--primary);
        }
        
        /* Mobile specific adjustments included in here */
        .space-y-3 > * + * {
            margin-top: 0.75rem;
        }
        .space-y-4 > * + * {
            margin-top: 1rem;
        }
      `}</style>
        </div>
    );
}
