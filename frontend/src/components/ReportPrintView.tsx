import React from 'react';
import { getRepresentativeLedgerTimeline, getRepresentativeTimeline, getSampleDisplayPaths } from '../logic/resultDisplay';
import { type SimulationInput, type SimulationResult } from '../logic/types';
import { formatMoney } from '../utils/format';
import { YearlyReportTable } from './YearlyReportTable';
import { SurvivalChart, AssetBreakdownChart, CashflowStackChart } from './Charts';

interface Props {
    input: SimulationInput;
    result: SimulationResult | null;
}

export const ReportPrintView: React.FC<Props> = ({ input, result }) => {
    if (!result) return null;

    const timeline = getRepresentativeTimeline(result);
    const samplePaths = getSampleDisplayPaths(result);
    const summary = result.summary;
    const sourceLabel = summary.source === "historical"
        ? "역사적 백테스트"
        : summary.source === "montecarlo"
            ? "몬테카를로"
            : "결정론";
    const ledgerRows = getRepresentativeLedgerTimeline(result);
    const ledgerRetirementRows = ledgerRows.length > 0
        ? (() => {
            const retirementStartIndex = ledgerRows.findIndex((row) => row.isRetired);
            const rows = retirementStartIndex >= 0
                ? ledgerRows.slice(retirementStartIndex, retirementStartIndex + 12)
                : ledgerRows.slice(0, 12);
            return rows;
        })()
        : [];
    const ledgerAverage = (selector: (row: typeof ledgerRetirementRows[number]) => number) =>
        ledgerRetirementRows.length > 0
            ? ledgerRetirementRows.reduce((sum, row) => sum + selector(row), 0) / ledgerRetirementRows.length
            : 0;
    const essentialBaselineAverage = ledgerAverage(
        (row) => row.expenses.essential + row.expenses.housing + row.expenses.medicalBaseline
    );
    const coveredEssentialMonths = ledgerRetirementRows.filter(
        (row) => row.incomes.totalNet >= (row.expenses.essential + row.expenses.housing + row.expenses.medicalBaseline)
    ).length;
    const essentialCoverageRate = ledgerRetirementRows.length > 0
        ? coveredEssentialMonths / ledgerRetirementRows.length
        : 0;

    return (
        <div className="hidden print:block print:bg-white print:text-black">
            {/* Cover Page */}
            <div className="print:break-after-page mb-8 text-center print:h-screen flex flex-col justify-center">
                <h1 className="text-4xl font-bold mb-4 text-slate-900">은퇴 시뮬레이션 리포트</h1>
                <p className="text-xl text-slate-500 mb-12">{new Date().toLocaleDateString()} 생성</p>

                <div className="inline-block text-left border border-slate-200 rounded-2xl bg-white p-8 w-full max-w-2xl mx-auto shadow-sm">
                    <h3 className="text-xl font-bold mb-6 border-b border-slate-200 pb-3 text-slate-800">기본 설정 요약</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                        <div>
                            <span className="text-slate-500 block text-sm font-medium mb-1">현재 나이 / 은퇴 나이</span>
                            <span className="font-bold text-lg text-slate-900">{input.current_age}세 / {input.retire_age}세</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-sm font-medium mb-1">시뮬레이션 종료</span>
                            <span className="font-bold text-lg text-slate-900">{input.end_age}세</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-sm font-medium mb-1">현재 총 자산</span>
                            <span className="font-bold text-lg text-slate-900">{formatMoney(input.general.current_balance)}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-sm font-medium mb-1">월 필요 생활비 (은퇴 후)</span>
                            <span className="font-bold text-lg text-slate-900">{formatMoney(input.withdrawal.targetMonthlySpending || input.withdrawal.fixedMonthlyAmount || 3000000)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="print:break-after-page mb-8 print:pt-8">
                <h2 className="text-2xl font-bold mb-6 border-b border-slate-200 pb-2 text-slate-800 flex items-center gap-2">
                    <span className="text-2xl print:hidden">📊</span> 시뮬레이션 결과 요약
                </h2>

                <div className="grid grid-cols-3 gap-6 mb-10">
                    <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="text-sm font-semibold text-slate-500 mb-2">은퇴 성공 확률</div>
                        <div className={`text-4xl font-extrabold tracking-tight ${summary.successRate > 0.8 ? 'text-emerald-600' : summary.successRate > 0.5 ? 'text-amber-500' : 'text-red-600'}`}>
                            {(summary.successRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs font-medium text-slate-400 mt-3">
                            {input.end_age}세까지 자산이 고갈되지 않을 확률
                        </div>
                    </div>
                    <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="text-sm font-semibold text-slate-500 mb-2">
                            {result.mode === "deterministic" ? "은퇴 시점 자산" : "은퇴 시점 자산 (중위값)"}
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                            {formatMoney(summary.retirementPoint.totalAssetsReal)}
                        </div>
                    </div>
                    <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="text-sm font-semibold text-slate-500 mb-2">
                            {result.mode === "deterministic" ? "최종 잔존 자산" : "최종 잔존 자산 (중위값)"}
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                            {formatMoney(result.mode === "deterministic" ? summary.finalTotalAssetsReal : summary.terminalStats.totalAssetsReal.p50)}
                        </div>
                    </div>
                </div>

                <div className="mb-8 border border-slate-200 rounded-xl bg-slate-50 p-5">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-slate-500 font-semibold mb-1">규칙 버전</div>
                            <div className="font-bold text-slate-800">{summary.ruleMetadata.version}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 font-semibold mb-1">데이터 소스</div>
                            <div className="font-bold text-slate-800">{sourceLabel}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 font-semibold mb-1">역사 데이터 범위</div>
                            <div className="font-bold text-slate-800">
                                {summary.ruleMetadata.historicalDataRange.startYear}-{summary.ruleMetadata.historicalDataRange.endYear}
                            </div>
                        </div>
                    </div>
                    {summary.assumptionWarnings.length > 0 && (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                            <div className="text-slate-500 font-semibold mb-2">가정 및 경고</div>
                            <ul className="m-0 pl-5 text-sm text-slate-700 space-y-1">
                                {summary.assumptionWarnings.map((warning) => (
                                    <li key={warning.code}>{warning.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {ledgerRetirementRows.length > 0 && (
                    <div className="mb-8 border border-slate-200 rounded-xl bg-slate-50 p-5 print:break-inside-avoid">
                        <h3 className="text-lg font-bold mb-4 text-slate-800">월별 원장 요약</h3>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="text-slate-500 font-semibold mb-1">월 순유입 평균</div>
                                <div className="font-bold text-slate-800">{formatMoney(ledgerAverage((row) => row.incomes.totalNet))}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 font-semibold mb-1">월 총지출 평균</div>
                                <div className="font-bold text-slate-800">{formatMoney(ledgerAverage((row) => row.expenses.total))}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 font-semibold mb-1">월 세금 평균</div>
                                <div className="font-bold text-slate-800">{formatMoney(ledgerAverage((row) => row.tax.taxPaid))}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 font-semibold mb-1">월 건보료 평균</div>
                                <div className="font-bold text-slate-800">{formatMoney(ledgerAverage((row) => row.expenses.healthInsurancePremium))}</div>
                            </div>
                        </div>
                        <div className="mt-4 text-sm">
                            <div className="text-slate-500 font-semibold mb-1">필수생활비 충족률</div>
                            <div className="font-bold text-slate-800">
                                {(essentialCoverageRate * 100).toFixed(0)}% / 기준 {formatMoney(essentialBaselineAverage)}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-10 print:break-inside-avoid">
                    <h3 className="text-lg font-bold mb-4 text-slate-800">자산 생존 확률 분석</h3>
                    <div className="h-80 w-full border border-slate-100 rounded-xl p-4 bg-white">
                        <SurvivalChart result={result} />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-3">
                        * {sourceLabel} 결과에 기반한 연령별 자산 생존 확률입니다.
                    </p>
                </div>

                <div className="mb-8 print:break-inside-avoid">
                    <h3 className="text-lg font-bold mb-4 text-slate-800">자산 구성 변화 (평균 시나리오)</h3>
                    <div className="h-80 w-full border border-slate-100 rounded-xl p-4 bg-white">
                        <AssetBreakdownChart data={timeline} />
                    </div>
                </div>
                {samplePaths.length > 0 && (
                    <div className="mb-8 border border-slate-200 rounded-xl bg-slate-50 p-5 print:break-inside-avoid">
                        <h3 className="text-lg font-bold mb-4 text-slate-800">샘플 경로</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            {samplePaths.map((sample) => {
                                const lastRow = sample.timeline[sample.timeline.length - 1];
                                return (
                                    <div key={`${sample.label}-${sample.pathIndex ?? "na"}`}>
                                        <div className="text-slate-500 font-semibold mb-1">{sample.label}</div>
                                        <div className="font-bold text-slate-800">
                                            {lastRow ? formatMoney(lastRow.totalAssetsReal) : "-"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Analysis */}
            <div className="print:break-after-page print:pt-8">
                <h2 className="text-2xl font-bold mb-6 border-b border-slate-200 pb-2 text-slate-800 flex items-center gap-2">
                    <span className="text-2xl print:hidden">📑</span> 상세 현금 흐름
                </h2>
                <div className="h-80 w-full border border-slate-100 rounded-xl p-4 bg-white mb-10 print:break-inside-avoid">
                    <CashflowStackChart data={timeline} />
                </div>

                <h3 className="text-lg font-bold mb-4 text-slate-800 print:break-before-page print:pt-8">연도별 예측표</h3>
                <div className="text-xs print:text-[10px]">
                    <YearlyReportTable data={timeline} />
                </div>
            </div>

            <div className="text-center text-xs font-medium text-slate-400 mt-12 pt-6 border-t border-slate-200 print:mt-auto">
                본 리포트는 시뮬레이션 결과이며 실제 투자의 미래 수익을 보장하지 않습니다. <br />
                Generated by Retirement Sim Pro
            </div>
        </div>
    );
};
