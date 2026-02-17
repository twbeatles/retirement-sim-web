import React, { Suspense, lazy, useMemo } from 'react';
import type { SimulationInput, SimulationResult, ValidationWarning } from '../../logic/types';
import { exportSimulationResult } from '../../logic/export';
import { PortfolioEditor } from '../PortfolioEditor';
import { WithdrawalSettings } from '../WithdrawalSettings';
import { ScenarioManager } from '../ScenarioManager';
import { AdvancedSettings } from '../AdvancedSettings';
import { FavoriteAssets } from '../FavoriteAssets';
import { IncomeManager } from '../IncomeManager';
import { ExpenseManager } from '../ExpenseManager';
import { GoalPlanner } from '../GoalPlanner';
import { Section, Field, SummaryCard } from '../common/UIComponents';
import { SIDEBAR_TABS, AnalysisTabType, ANALYSIS_TABS } from '../../logic/uiConstants';
import { formatMoney, num } from '../../utils/format';

const RiskDashboard = lazy(() => import('../RiskDashboard').then((m) => ({ default: m.RiskDashboard })));
const ScenarioComparison = lazy(() => import('../ScenarioComparison').then((m) => ({ default: m.ScenarioComparison })));
const WhatIfSlider = lazy(() => import('../WhatIfSlider').then((m) => ({ default: m.WhatIfSlider })));
const PensionOptimizer = lazy(() => import('../PensionOptimizer').then((m) => ({ default: m.PensionOptimizer })));
const BacktestingPanel = lazy(() => import('../BacktestingPanel').then((m) => ({ default: m.BacktestingPanel })));
const FanChart = lazy(() => import('../Charts').then((m) => ({ default: m.FanChart })));
const AssetBreakdownChart = lazy(() => import('../Charts').then((m) => ({ default: m.AssetBreakdownChart })));
const CashflowStackChart = lazy(() => import('../Charts').then((m) => ({ default: m.CashflowStackChart })));
const SurvivalChart = lazy(() => import('../Charts').then((m) => ({ default: m.SurvivalChart })));
const YearlyReportTable = lazy(() => import('../YearlyReportTable').then((m) => ({ default: m.YearlyReportTable })));

interface DesktopLayoutProps {
    input: SimulationInput;
    setInput: (input: SimulationInput) => void;
    result: SimulationResult | null;
    validationWarnings: ValidationWarning[];
    sidebarTab: string;
    setSidebarTab: (tab: string) => void;
    analysisTab: AnalysisTabType;
    setAnalysisTab: (tab: AnalysisTabType) => void;
    onPrint: () => void;
}

export function DesktopLayout({
    input,
    setInput,
    result,
    validationWarnings,
    sidebarTab,
    setSidebarTab,
    analysisTab,
    setAnalysisTab,
    onPrint
}: DesktopLayoutProps) {

    const timeline = useMemo(() => {
        if (!result) return [];
        if (result.mode === "deterministic") return result.timeline;
        return result.sampleTimelines[0] || [];
    }, [result]);

    const summary = result?.summary;

    return (
        <>
            <aside className="sidebar">
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

                            <ExpenseManager input={input} onChange={setInput} />
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

                            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                                <PensionOptimizer input={input} />
                            </Suspense>

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
                            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                                <BacktestingPanel input={input} onInputChange={setInput} />
                            </Suspense>
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

                {result && (
                    <div className="text-right flex gap-2 justify-end">
                        <button
                            className="btn btn-secondary"
                            onClick={onPrint}
                        >
                            🖨️ 리포트 인쇄 (PDF)
                        </button>
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
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                            <SurvivalChart result={result} />
                        </Suspense>
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
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                            <AssetBreakdownChart data={timeline} />
                        </Suspense>
                    ) : result?.mode === 'montecarlo' && result.trajectoryStats ? (
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                            <FanChart stats={result.trajectoryStats} />
                        </Suspense>
                    ) : (
                        <div className="text-center text-muted py-8">시뮬레이션 결과를 기다리는 중...</div>
                    )}
                </div>

                <div className="card">
                    <h3 className="card-header">💵 은퇴 후 현금 흐름 (Income vs Spending)</h3>
                    <p className="text-sub text-sm mb-4">
                        연금 소득과 자산 인출이 생활비를 어떻게 충당하는지 보여줍니다.
                    </p>
                    <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                        <CashflowStackChart data={timeline} />
                    </Suspense>
                </div>

                <div className="card">
                    <h3 className="card-header">📋 연도별 상세 리포트</h3>
                    <Suspense fallback={<div className="text-center text-muted py-4">Loading table...</div>}>
                        <YearlyReportTable data={timeline} />
                    </Suspense>
                </div>

                {/* Analysis Tabs */}
                <div className="card">
                    <div className="tabs">
                        {ANALYSIS_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setAnalysisTab(tab.id)}
                                className={`tab ${analysisTab === tab.id ? 'active' : ''}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {analysisTab === 'risk' && (
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                            <RiskDashboard input={input} result={result} onInputChange={setInput} />
                        </Suspense>
                    )}
                    {analysisTab === 'compare' && (
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                            <ScenarioComparison currentInput={input} currentResult={result} />
                        </Suspense>
                    )}
                    {analysisTab === 'whatif' && (
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                            <WhatIfSlider input={input} onInputChange={setInput} />
                        </Suspense>
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
    );
}

