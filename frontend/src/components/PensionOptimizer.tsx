import React, { useState, useEffect } from 'react';
import { SimulationInput } from '../logic/types';
import { optimizePensionStartAge } from '../logic/solver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { formatMoney } from '../utils/format';

interface Props {
    input: SimulationInput;
}

export const PensionOptimizer: React.FC<Props> = ({ input }) => {
    const [results, setResults] = useState<{ age: number; totalPayout: number; npv: number; successRate: number }[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const runOptimization = () => {
        setIsCalculating(true);
        // Defer to next tick to allow UI to update
        setTimeout(() => {
            const res = optimizePensionStartAge(input);
            setResults(res);
            setIsCalculating(false);
        }, 100);
    };

    // Find optimal age based on Total Payout
    const optimalPayoutAge = results ? results.reduce((prev, current) => (prev.totalPayout > current.totalPayout) ? prev : current).age : 65;

    // Find optimal age based on NPV (Opportunity Cost Corrected)
    const optimalNpvAge = results ? results.reduce((prev, current) => (prev.npv > current.npv) ? prev : current).age : 65;

    // Find optimal age based on Success Rate (if difference is significant)
    const optimalSuccessAge = results ? results.reduce((prev, current) => (prev.successRate > current.successRate) ? prev : current).age : 65;

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="card-header mb-0">✨ 국민연금 최적 수령 시기 분석</h3>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={runOptimization}
                    disabled={isCalculating}
                >
                    {isCalculating ? '분석 중...' : '분석 시작'}
                </button>
            </div>

            {!results && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <p>버튼을 눌러 60세~70세 수령 시나리오를 비교해보세요.</p>
                </div>
            )}

            {results && (
                <div className="animate-fadeIn space-y-6">
                    {/* Summary Recommendation */}
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">💡</span>
                            <div>
                                <h4 className="font-bold text-indigo-900 mb-1">분석 결과 요약</h4>
                                <ul className="text-sm text-indigo-800 space-y-1">
                                    <li>
                                        총 수령액(단순 합계) 기준으로는 <strong className="text-indigo-600">{optimalPayoutAge}세</strong> 수령이 가장 유리합니다.
                                    </li>
                                    <li>
                                        투자 기회비용을 고려한 현재가치(NPV) 기준으로는 <strong className="text-indigo-600">{optimalNpvAge}세</strong> 수령이 가장 유리합니다.
                                    </li>
                                    <li>
                                        은퇴 성공 확률({input.end_age}세 생존) 기준으로는 <strong className="text-indigo-600">{optimalSuccessAge}세</strong> 수령이 가장 유리합니다.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="h-64">
                        <h5 className="text-sm font-bold text-gray-600 mb-2 text-center">수령 시기별 총 수령액 및 성공률</h5>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={results} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="age" label={{ value: '수령 나이', position: 'insideBottom', offset: -5 }} />
                                <YAxis yAxisId="left" orientation="left" tickFormatter={(val) => `${val / 100000000}억`} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} domain={[0, 1]} />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === '총 수령액') return formatMoney(value);
                                        if (name === '성공 확률') return `${(value * 100).toFixed(1)}%`;
                                        return value;
                                    }}
                                    labelFormatter={(label) => `${label}세 수령`}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalPayout" name="총 수령액" fill="#8884d8" barSize={20} radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="successRate" name="성공 확률" stroke="#82ca9d" strokeWidth={3} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b bg-gray-50 text-gray-600">
                                    <th className="p-2 text-center">수령 나이</th>
                                    <th className="p-2">총 수령액 (예상)</th>
                                    <th className="p-2">현재 가치 (NPV)</th>
                                    <th className="p-2">은퇴 성공률</th>
                                    <th className="p-2">비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r) => {
                                    const isMaxPayout = r.age === optimalPayoutAge;
                                    const isMaxNpv = r.age === optimalNpvAge;
                                    const isMaxSuccess = r.age === optimalSuccessAge;
                                    return (
                                        <tr key={r.age} className={`border-b hover:bg-gray-50 ${isMaxPayout || isMaxSuccess || isMaxNpv ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="p-2 text-center font-bold text-gray-700">{r.age}세</td>
                                            <td className={`p-2 ${isMaxPayout ? 'text-indigo-600 font-bold' : ''}`}>{formatMoney(r.totalPayout)}</td>
                                            <td className={`p-2 ${isMaxNpv ? 'text-purple-600 font-bold' : ''}`}>{formatMoney(r.npv)}</td>
                                            <td className={`p-2 ${isMaxSuccess ? 'text-green-600 font-bold' : ''}`}>{(r.successRate * 100).toFixed(1)}%</td>
                                            <td className="p-2 text-xs text-gray-500 text-center">
                                                {isMaxPayout && <span className="badge badge-indigo mr-1">최대 수령</span>}
                                                {isMaxNpv && <span className="badge badge-purple mr-1">최대 가치</span>}
                                                {isMaxSuccess && <span className="badge badge-green">최고 확률</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="text-xs text-right text-gray-400">
                        * 총 수령액은 현재 가치 기준이 아닌 명목 금액 합계일 수 있습니다. (설정에 따라 상이)
                    </div>
                </div>
            )}
        </div>
    );
};
