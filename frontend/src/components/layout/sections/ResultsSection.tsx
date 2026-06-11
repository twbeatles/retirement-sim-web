import React, { Suspense, lazy, useMemo } from "react";
import { exportSimulationResult } from "../../../logic/export";
import { formatMoney } from "../../../utils/format";
import { ANALYSIS_TABS } from "../../../logic/uiConstants";
import type { AnalysisTabType } from "../types";
import type { SimulationInput, SimulationResult } from "../../../logic/types";
import { useNearViewport } from "../../../hooks/useNearViewport";
import { deriveLedgerSummary, deriveResultDisplayData } from "./resultsDerivations";

const RiskDashboard = lazy(() => import("../../RiskDashboard").then((m) => ({ default: m.RiskDashboard })));
const ScenarioComparison = lazy(() => import("../../ScenarioComparison").then((m) => ({ default: m.ScenarioComparison })));
const WhatIfSlider = lazy(() => import("../../WhatIfSlider").then((m) => ({ default: m.WhatIfSlider })));
const FanChart = lazy(() => import("../../Charts/FanChart").then((m) => ({ default: m.FanChart })));
const AssetBreakdownChart = lazy(() => import("../../Charts/AssetBreakdownChart").then((m) => ({ default: m.AssetBreakdownChart })));
const CashflowStackChart = lazy(() => import("../../Charts/CashflowStackChart").then((m) => ({ default: m.CashflowStackChart })));
const SurvivalChart = lazy(() => import("../../Charts/SurvivalChart").then((m) => ({ default: m.SurvivalChart })));
const YearlyReportTable = lazy(() => import("../../YearlyReportTable").then((m) => ({ default: m.YearlyReportTable })));

type DeferredRenderProps = {
    enabled: boolean;
    placeholder: React.ReactNode;
    children: React.ReactNode;
    rootMargin?: string;
};

function DeferredRender({ enabled, placeholder, children, rootMargin = "360px" }: DeferredRenderProps) {
    const { ref, isNearViewport } = useNearViewport({ enabled, rootMargin, once: true });

    if (!enabled) {
        return <>{placeholder}</>;
    }

    return <div ref={ref}>{isNearViewport ? children : placeholder}</div>;
}

interface ResultsSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
    result: SimulationResult | null;
    analysisTab: AnalysisTabType;
    setAnalysisTab: (tab: AnalysisTabType) => void;
    onPrint: () => void;
    compact?: boolean;
}

export const ResultsSection = React.memo(function ResultsSection({
    input,
    setInput,
    result,
    analysisTab,
    setAnalysisTab,
    onPrint,
    compact = false
}: ResultsSectionProps) {
    const {
        timeline,
        samplePaths,
        summary,
        isPreviewResult,
        simulationCount,
        retirementRealAssets,
        finalRealAssets,
        sourceLabel,
        modeLabel,
    } = useMemo(() => deriveResultDisplayData(input, result), [input, result]);
    const ledgerSummary = useMemo(() => deriveLedgerSummary(result), [result]);

    return (
        <>
            {summary && (
                <div className="mb-6 lg:mb-8">
                    <div className="mb-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-100/80 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-zinc-700/60">
                            결과 소스: {sourceLabel}
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-100/80 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-zinc-700/60">
                            계산 형식: {modeLabel}
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-100/80 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-zinc-700/60">
                            규칙 버전: {summary.ruleMetadata.version}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md rounded-[1.5rem] p-5 sm:p-6 border border-slate-200/50 dark:border-zinc-700/50 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300 group">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">은퇴 성공 확률</div>
                            <div
                                className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tighter my-2 ${summary.successRate > 0.8 ? "text-emerald-500" : summary.successRate > 0.5 ? "text-amber-500" : "text-rose-500"}`}
                            >
                                {(summary.successRate * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                {input.end_age}세까지 자산 유지 <br className="hidden sm:block" />({simulationCount}회 시뮬레이션)
                            </div>
                        </div>
                        <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md rounded-[1.5rem] p-5 sm:p-6 border border-slate-200/50 dark:border-zinc-700/50 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                {result?.mode === "deterministic" ? "은퇴 시 자산" : "은퇴 시 자산 (중위값)"}
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tabular-nums tracking-tight my-2">{formatMoney(retirementRealAssets)}</div>
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">현재 가치 기준 (물가 반영)</div>
                        </div>
                        <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md rounded-[1.5rem] p-5 sm:p-6 border border-slate-200/50 dark:border-zinc-700/50 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all duration-300">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                {result?.mode === "deterministic" ? "최종 자산 잔존" : "최종 자산 잔존 (중위값)"}
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tabular-nums tracking-tight my-2">{formatMoney(finalRealAssets)}</div>
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">{input.end_age}세 시점 예상 잔고</div>
                        </div>
                    </div>
                    {summary.assumptionWarnings.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/30 bg-amber-50/70 dark:bg-amber-900/10 p-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">가정 및 경고</div>
                            <div className="flex flex-col gap-2">
                                {summary.assumptionWarnings.map((warning) => (
                                    <div key={warning.code} className="text-sm text-amber-800 dark:text-amber-200">
                                        {warning.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {ledgerSummary && !isPreviewResult && (
                <div className="mb-8 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 relative overflow-hidden">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">🧾 월별 원장 요약</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">
                        은퇴 초반 12개월 기준으로 소득, 지출, 세금, 건강보험료를 분리해 보여줍니다.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-200/50 dark:border-zinc-700/50">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">월 순유입 평균</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(ledgerSummary.avgNetIncome)}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-200/50 dark:border-zinc-700/50">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">월 총지출 평균</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(ledgerSummary.avgTotalExpense)}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-200/50 dark:border-zinc-700/50">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">월 세금 평균</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(ledgerSummary.avgTax)}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-200/50 dark:border-zinc-700/50">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">월 건보료 평균</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(ledgerSummary.avgHealthInsurance)}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-200/50 dark:border-zinc-700/50">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">필수생활비 충족</div>
                            <div className={`text-2xl font-black ${ledgerSummary.coveredMonthRate >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                {(ledgerSummary.coveredMonthRate * 100).toFixed(0)}%
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                기준 {formatMoney(ledgerSummary.essentialBaseline)} / 평균 {Math.round(ledgerSummary.averageCoverageRatio * 100)}%
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-zinc-700/50 bg-white/40 dark:bg-black/20">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/80 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-300">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold">월</th>
                                    <th className="px-4 py-3 text-right font-bold">순유입</th>
                                    <th className="px-4 py-3 text-right font-bold">총지출</th>
                                    <th className="px-4 py-3 text-right font-bold">세금</th>
                                    <th className="px-4 py-3 text-right font-bold">건보료</th>
                                    <th className="px-4 py-3 text-right font-bold">실질 총자산</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerSummary.rows.map((row) => (
                                    <tr key={row.month} className="border-t border-slate-200/50 dark:border-zinc-800/60 text-slate-700 dark:text-slate-200">
                                        <td className="px-4 py-3">{row.month + 1}개월차</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.incomes.totalNet)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.expenses.total)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.tax.taxPaid)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.expenses.healthInsurancePremium)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.balances.totalAssetsReal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {samplePaths.length > 0 && !isPreviewResult && (
                <div className="mb-8 rounded-[2rem] border border-slate-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40">
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-2">샘플 경로</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">
                        분포 요약과 별도로 보조 해석용 샘플 경로를 따로 표시합니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {samplePaths.map((sample) => {
                            const lastRow = sample.timeline[sample.timeline.length - 1];
                            return (
                                <div key={`${sample.label}-${sample.pathIndex ?? "na"}`} className="rounded-2xl border border-slate-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-black/20 p-4">
                                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{sample.label}</div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white">
                                        {lastRow ? formatMoney(lastRow.totalAssetsReal) : "-"}
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                        {lastRow ? `${Math.floor(lastRow.age)}세 기준 실질 총자산` : "경로 정보 없음"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {result && !isPreviewResult && (
                <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
                    <button className={`px-4 sm:px-5 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-zinc-700/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${compact ? "text-xs px-3 py-1.5" : ""}`} onClick={onPrint}>
                        🖨️ {compact ? "PDF" : "리포트 인쇄 (PDF)"}
                    </button>
                    <button className={`px-4 sm:px-5 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-zinc-700/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${compact ? "text-xs px-3 py-1.5" : ""}`} onClick={() => exportSimulationResult(result)}>
                        💾 {compact ? "CSV 저장" : "원시 데이터 다운로드 (CSV)"}
                    </button>
                </div>
            )}

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 mb-8 transition-all relative overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">📊 자산 생존 확률</h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">
                    은퇴 후 나이가 들면서 자산이 남아있을 확률을 보여줍니다. (몬테카를로 분석)
                </p>
                {result && !isPreviewResult ? (
                    <DeferredRender
                        enabled={Boolean(result)}
                        placeholder={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}
                    >
                        <Suspense fallback={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}>
                            <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-4 sm:p-6 border border-slate-100/50 dark:border-zinc-800/50 shadow-inner">
                                <SurvivalChart result={result} />
                            </div>
                        </Suspense>
                    </DeferredRender>
                ) : (
                    <div className="text-center text-slate-400 py-10 font-medium">최종 계산 결과를 기다리는 중...</div>
                )}
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 mb-8 transition-all relative overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">📈 자산 구성 추이</h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">부동산, 연금, 일반 자산이 어떻게 변화하는지 보여줍니다.</p>
                {isPreviewResult ? (
                    <div className="text-center text-slate-400 py-10 font-medium">빠른 추정값 계산 완료. 최종 차트 계산 중...</div>
                ) : result?.mode === "deterministic" ? (
                    <DeferredRender
                        enabled={timeline.length > 0}
                        placeholder={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}
                    >
                        <Suspense fallback={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}>
                            <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-4 sm:p-6 border border-slate-100/50 dark:border-zinc-800/50 shadow-inner overflow-hidden">
                                <AssetBreakdownChart data={timeline} />
                            </div>
                        </Suspense>
                    </DeferredRender>
                ) : result && result.trajectoryStats ? (
                    <DeferredRender
                        enabled={Boolean(result.trajectoryStats)}
                        placeholder={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}
                    >
                        <Suspense fallback={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}>
                            <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-4 sm:p-6 border border-slate-100/50 dark:border-zinc-800/50 shadow-inner overflow-hidden">
                                <FanChart stats={result.trajectoryStats} />
                            </div>
                        </Suspense>
                    </DeferredRender>
                ) : (
                    <div className="text-center text-slate-400 py-10 font-medium">시뮬레이션 결과를 기다리는 중...</div>
                )}
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 mb-8 transition-all relative overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">💵 은퇴 후 현금 흐름</h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">연금 소득과 자산 인출이 생활비를 어떻게 충당하는지 보여줍니다.</p>
                {timeline.length > 0 && !isPreviewResult ? (
                    <DeferredRender
                        enabled={timeline.length > 0}
                        placeholder={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}
                    >
                        <Suspense fallback={<div className="text-center text-slate-400 py-4">차트 로딩 중...</div>}>
                            <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-4 sm:p-6 border border-slate-100/50 dark:border-zinc-800/50 shadow-inner overflow-hidden">
                                <CashflowStackChart data={timeline} />
                            </div>
                        </Suspense>
                    </DeferredRender>
                ) : (
                    <div className="text-center text-slate-400 py-10 font-medium">최종 계산 결과를 기다리는 중...</div>
                )}
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 mb-8 transition-all relative overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">📋 연도별 상세 리포트</h3>
                <div className="overflow-x-auto w-full max-h-[600px] overflow-y-auto no-scrollbar rounded-[1.5rem] border border-slate-200/60 dark:border-zinc-700/50 bg-white/40 dark:bg-black/30 p-2 sm:p-6 shadow-inner relative">
                    {timeline.length > 0 && !isPreviewResult ? (
                        <DeferredRender
                            enabled={timeline.length > 0}
                            placeholder={<div className="text-center text-slate-400 py-4">표 로딩 중...</div>}
                        >
                            <Suspense fallback={<div className="text-center text-slate-400 py-4">표 로딩 중...</div>}>
                                <YearlyReportTable data={timeline} />
                            </Suspense>
                        </DeferredRender>
                    ) : (
                        <div className="text-center text-slate-400 py-10 font-medium">최종 계산 결과를 기다리는 중...</div>
                    )}
                </div>
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/40 dark:shadow-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 mb-8 transition-all relative overflow-hidden">
                <div className={`flex flex-wrap gap-2 mb-8 p-1.5 bg-slate-100/50 dark:bg-zinc-800/50 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 w-fit ${compact ? "scale-90 origin-left" : ""}`}>
                    {ANALYSIS_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setAnalysisTab(tab.id)}
                            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all cursor-pointer select-none ${analysisTab === tab.id ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-slate-200/50 dark:ring-zinc-600/50" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/80"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {isPreviewResult ? (
                    <div className="text-center text-slate-400 py-10 font-medium">고급 분석은 최종 계산 완료 후 표시됩니다.</div>
                ) : (
                    <DeferredRender
                        enabled={Boolean(result)}
                        placeholder={<div className="text-center text-slate-400 py-4">로딩 중...</div>}
                        rootMargin="420px"
                    >
                        <div className="bg-slate-50/40 dark:bg-black/10 rounded-2xl sm:p-4 border border-slate-100/50 dark:border-zinc-800/30">
                            {analysisTab === "risk" && (
                                <Suspense fallback={<div className="text-center text-slate-400 py-4">로딩 중...</div>}>
                                    <RiskDashboard input={input} result={result} onInputChange={setInput} />
                                </Suspense>
                            )}
                            {analysisTab === "compare" && (
                                <Suspense fallback={<div className="text-center text-slate-400 py-4">로딩 중...</div>}>
                                    <ScenarioComparison currentResult={result} />
                                </Suspense>
                            )}
                            {analysisTab === "whatif" && (
                                <Suspense fallback={<div className="text-center text-slate-400 py-4">로딩 중...</div>}>
                                    <WhatIfSlider input={input} onInputChange={setInput} />
                                </Suspense>
                            )}
                        </div>
                    </DeferredRender>
                )}
            </div>

            <footer className="text-center py-8 opacity-70">
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                    본 시뮬레이션은 가정에 기반한 단순 예측이며, 실제 미래 수익률을 보장하지 않습니다.
                    <br />
                    모든 계산은 브라우저 내에서 수행되며, 서버로 데이터가 전송되지 않습니다.
                </p>
            </footer>
        </>
    );
});
