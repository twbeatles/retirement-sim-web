import React, { Suspense, lazy, useMemo } from "react";
import { exportSimulationResult } from "../../../logic/export";
import { formatMoney } from "../../../utils/format";
import { ANALYSIS_TABS } from "../../../logic/uiConstants";
import type { AnalysisTabType } from "../types";
import type { SimulationInput, SimulationResult } from "../../../logic/types";

const RiskDashboard = lazy(() => import("../../RiskDashboard").then((m) => ({ default: m.RiskDashboard })));
const ScenarioComparison = lazy(() => import("../../ScenarioComparison").then((m) => ({ default: m.ScenarioComparison })));
const WhatIfSlider = lazy(() => import("../../WhatIfSlider").then((m) => ({ default: m.WhatIfSlider })));
const FanChart = lazy(() => import("../../Charts/FanChart").then((m) => ({ default: m.FanChart })));
const AssetBreakdownChart = lazy(() => import("../../Charts/AssetBreakdownChart").then((m) => ({ default: m.AssetBreakdownChart })));
const CashflowStackChart = lazy(() => import("../../Charts/CashflowStackChart").then((m) => ({ default: m.CashflowStackChart })));
const SurvivalChart = lazy(() => import("../../Charts/SurvivalChart").then((m) => ({ default: m.SurvivalChart })));
const YearlyReportTable = lazy(() => import("../../YearlyReportTable").then((m) => ({ default: m.YearlyReportTable })));

interface ResultsSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
    result: SimulationResult | null;
    analysisTab: AnalysisTabType;
    setAnalysisTab: (tab: AnalysisTabType) => void;
    onPrint: () => void;
    compact?: boolean;
}

export function ResultsSection({
    input,
    setInput,
    result,
    analysisTab,
    setAnalysisTab,
    onPrint,
    compact = false
}: ResultsSectionProps) {
    const timeline = useMemo(() => {
        if (!result) return [];
        if (result.mode === "deterministic") return result.timeline;
        return result.sampleTimelines[0] || [];
    }, [result]);

    const summary = result?.summary;
    const isPreviewResult = result?.detailLevel === "preview";
    const simulationCount = result
        ? result.mode === "deterministic"
            ? 1
            : result.pathCount
        : input.simulation_settings.mc_paths;
    const medianRealAssets = summary
        ? result?.mode === "deterministic"
            ? summary.finalTotalAssetsReal
            : (summary.mc?.totalAssetsReal.p50 ?? summary.finalTotalAssetsReal)
        : 0;
    const meanRealAssets = summary
        ? result?.mode === "deterministic"
            ? summary.finalTotalAssetsReal
            : (summary.mc?.totalAssetsReal.mean ?? summary.finalTotalAssetsReal)
        : 0;

    return (
        <>
            {summary && (
                <div className="summary-grid">
                    <div className="summary-card">
                        <div className="summary-title">은퇴 성공 확률</div>
                        <div
                            className={`summary-value ${summary.successRate > 0.8 ? "text-success" : summary.successRate > 0.5 ? "text-warning" : "text-danger"}`}
                        >
                            {(summary.successRate * 100).toFixed(1)}%
                        </div>
                        <div className="summary-desc">
                            {input.end_age}세까지 자산 유지 ({simulationCount}회 시뮬레이션)
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-title">
                            {result?.mode === "deterministic" ? "은퇴 시 자산" : "은퇴 시 자산 (중위값)"}
                        </div>
                        <div className="summary-value">{formatMoney(medianRealAssets)}</div>
                        <div className="summary-desc">현재 가치 기준 (물가 반영)</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-title">
                            {result?.mode === "deterministic" ? "최종 자산 잔존" : "최종 자산 잔존 (평균값)"}
                        </div>
                        <div className="summary-value">{formatMoney(meanRealAssets)}</div>
                        <div className="summary-desc">{input.end_age}세 시점 예상 잔고</div>
                    </div>
                </div>
            )}

            {result && !isPreviewResult && (
                <div className="results-actions">
                    <button className={`btn btn-secondary ${compact ? "btn-sm" : ""}`} onClick={onPrint}>
                        🖨️ {compact ? "PDF" : "리포트 인쇄 (PDF)"}
                    </button>
                    <button className={`btn btn-secondary ${compact ? "btn-sm" : ""}`} onClick={() => exportSimulationResult(result)}>
                        💾 {compact ? "CSV 저장" : "결과 다운로드 (CSV)"}
                    </button>
                </div>
            )}

            <div className="card">
                <h3 className="card-header">📊 자산 생존 확률 (Survival Analysis)</h3>
                <p className="text-sub text-sm mb-4">
                    은퇴 후 나이가 들면서 자산이 남아있을 확률을 보여줍니다. (몬테카를로 분석)
                </p>
                {result && !isPreviewResult ? (
                    <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                        <SurvivalChart result={result} />
                    </Suspense>
                ) : (
                    <div className="text-center text-muted py-8">최종 계산 결과를 기다리는 중...</div>
                )}
            </div>

            <div className="card">
                <h3 className="card-header">📈 자산 구성 추이</h3>
                <p className="text-sub text-sm mb-4">부동산, 연금, 일반 자산이 어떻게 변화하는지 보여줍니다.</p>
                {isPreviewResult ? (
                    <div className="text-center text-muted py-8">빠른 추정값 계산 완료. 최종 차트 계산 중...</div>
                ) : result?.mode === "deterministic" ? (
                    <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                        <AssetBreakdownChart data={timeline} />
                    </Suspense>
                ) : result?.mode === "montecarlo" && result.trajectoryStats ? (
                    <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                        <FanChart stats={result.trajectoryStats} />
                    </Suspense>
                ) : (
                    <div className="text-center text-muted py-8">시뮬레이션 결과를 기다리는 중...</div>
                )}
            </div>

            <div className="card">
                <h3 className="card-header">💵 은퇴 후 현금 흐름 (Income vs Spending)</h3>
                <p className="text-sub text-sm mb-4">연금 소득과 자산 인출이 생활비를 어떻게 충당하는지 보여줍니다.</p>
                {timeline.length > 0 && !isPreviewResult ? (
                    <Suspense fallback={<div className="text-center text-muted py-4">Loading chart...</div>}>
                        <CashflowStackChart data={timeline} />
                    </Suspense>
                ) : (
                    <div className="text-center text-muted py-8">최종 계산 결과를 기다리는 중...</div>
                )}
            </div>

            <div className="card">
                <h3 className="card-header">📋 연도별 상세 리포트</h3>
                <div className="report-scroll">
                    {timeline.length > 0 && !isPreviewResult ? (
                        <Suspense fallback={<div className="text-center text-muted py-4">Loading table...</div>}>
                            <YearlyReportTable data={timeline} />
                        </Suspense>
                    ) : (
                        <div className="text-center text-muted py-8">최종 계산 결과를 기다리는 중...</div>
                    )}
                </div>
            </div>

            <div className="card">
                <div className={`tabs ${compact ? "tabs-compact" : ""}`}>
                    {ANALYSIS_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setAnalysisTab(tab.id)}
                            className={`tab ${analysisTab === tab.id ? "active" : ""}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {isPreviewResult ? (
                    <div className="text-center text-muted py-8">고급 분석은 최종 계산 완료 후 표시됩니다.</div>
                ) : (
                    <>
                        {analysisTab === "risk" && (
                            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                                <RiskDashboard input={input} result={result} onInputChange={setInput} />
                            </Suspense>
                        )}
                        {analysisTab === "compare" && (
                            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                                <ScenarioComparison currentResult={result} />
                            </Suspense>
                        )}
                        {analysisTab === "whatif" && (
                            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                                <WhatIfSlider input={input} onInputChange={setInput} />
                            </Suspense>
                        )}
                    </>
                )}
            </div>

            <footer className="footer">
                <p>
                    본 시뮬레이션은 가정에 기반한 단순 예측이며, 실제 미래 수익률을 보장하지 않습니다.
                    <br />
                    모든 계산은 브라우저 내에서 수행되며, 서버로 데이터가 전송되지 않습니다.
                </p>
            </footer>
        </>
    );
}
