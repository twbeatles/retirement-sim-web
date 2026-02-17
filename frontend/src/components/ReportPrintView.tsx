import React from 'react';
import { SimulationInput, SimulationResult } from '../logic/types';
import { formatMoney } from '../utils/format';
import { YearlyReportTable } from './YearlyReportTable';
import { SurvivalChart, AssetBreakdownChart, CashflowStackChart } from './Charts';

interface Props {
    input: SimulationInput;
    result: SimulationResult | null;
}

export const ReportPrintView: React.FC<Props> = ({ input, result }) => {
    if (!result) return null;

    const timeline = result.mode === 'deterministic' ? result.timeline : result.sampleTimelines[0] || [];
    const summary = result.summary;

    return (
        <div className="print-only">
            {/* Cover Page */}
            <div className="print-page break-after mb-8 text-center">
                <h1 className="text-4xl font-bold mb-4 mt-20">은퇴 시뮬레이션 리포트</h1>
                <p className="text-xl report-created-date mb-8">{new Date().toLocaleDateString()} 생성</p>

                <div className="inline-block text-left print-summary-card p-8">
                    <h3 className="text-xl font-bold mb-4 border-b pb-2">기본 설정 요약</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div>
                            <span className="text-gray-500 block text-sm">현재 나이 / 은퇴 나이</span>
                            <span className="font-bold text-lg">{input.current_age}세 / {input.retire_age}세</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-sm">시뮬레이션 종료</span>
                            <span className="font-bold text-lg">{input.end_age}세</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-sm">현재 총 자산</span>
                            <span className="font-bold text-lg">{formatMoney(input.general.current_balance)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-sm">월 필요 생활비 (은퇴 후)</span>
                            <span className="font-bold text-lg">{formatMoney(input.withdrawal.targetMonthlySpending || input.withdrawal.fixedMonthlyAmount || 3000000)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="print-page break-after mb-8">
                <h2 className="text-2xl font-bold mb-6 border-b pb-2">📊 시뮬레이션 결과 요약</h2>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-4 border rounded bg-gray-50">
                        <div className="text-sm text-gray-500 mb-1">은퇴 성공 확률</div>
                        <div className={`text-3xl font-bold ${summary.successRate > 0.8 ? 'text-green-600' : 'text-red-600'}`}>
                            {(summary.successRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                            {input.end_age}세까지 자산이 고갈되지 않을 확률
                        </div>
                    </div>
                    <div className="p-4 border rounded bg-gray-50">
                        <div className="text-sm text-gray-500 mb-1">은퇴 시점 자산 (중위값)</div>
                        <div className="text-2xl font-bold">
                            {formatMoney(summary.mc?.totalAssetsReal.p50 || 0)}
                        </div>
                    </div>
                    <div className="p-4 border rounded bg-gray-50">
                        <div className="text-sm text-gray-500 mb-1">최종 잔존 자산 (중위값)</div>
                        <div className="text-2xl font-bold">
                            {formatMoney(summary.mc?.totalAssetsReal.mean || 0)}
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4">자산 생존 확률 분석</h3>
                    <div className="print-chart-box">
                        <SurvivalChart result={result} />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        * 1,000회 몬테카를로 시뮬레이션 결과에 기반한 연령별 자산 생존 확률입니다.
                    </p>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4">자산 구성 변화 (평균 시나리오)</h3>
                    <div className="print-chart-box">
                        <AssetBreakdownChart data={timeline} />
                    </div>
                </div>
            </div>

            {/* Detailed Analysis */}
            <div className="print-page break-after">
                <h2 className="text-2xl font-bold mb-6 border-b pb-2">📑 상세 현금 흐름</h2>
                <div className="print-chart-box mb-8">
                    <CashflowStackChart data={timeline} />
                </div>

                <h3 className="text-lg font-bold mb-4">연도별 예측표</h3>
                <div className="text-xs">
                    <YearlyReportTable data={timeline} />
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-8">
                본 리포트는 시뮬레이션 결과이며 실제 투자의 미래 수익을 보장하지 않습니다. <br />
                Generated by Retirement Sim Pro
            </div>
        </div>
    );
};
