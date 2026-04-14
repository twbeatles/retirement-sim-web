import React, { useState } from 'react';
import { type SimulationInput } from '../logic/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { formatMoney } from '../utils/format';
import { requestPensionOptimization } from '../logic/simulationClient';

interface Props {
    input: SimulationInput;
}

export const PensionOptimizer: React.FC<Props> = ({ input }) => {
    const [results, setResults] = useState<{ age: number; totalPayout: number; npv: number; successRate: number }[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const runOptimization = async () => {
        setIsCalculating(true);
        try {
            const res = await requestPensionOptimization(input);
            setResults(res);
        } catch (error) {
            console.error('Pension optimization failed:', error);
        } finally {
            setIsCalculating(false);
        }
    };

    const optimalPayoutAge = results
        ? results.reduce((prev, current) => (prev.totalPayout > current.totalPayout ? prev : current)).age
        : 65;

    const optimalNpvAge = results
        ? results.reduce((prev, current) => (prev.npv > current.npv ? prev : current)).age
        : 65;

    const optimalSuccessAge = results
        ? results.reduce((prev, current) => (prev.successRate > current.successRate ? prev : current)).age
        : 65;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-0 flex items-center gap-2">
                    <span className="text-xl leading-none">🎯</span> 국민연금 최적 수령 시기 분석
                </h3>
                <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-700 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    onClick={runOptimization}
                    disabled={isCalculating}
                >
                    {isCalculating ? (
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            분석 중...
                        </div>
                    ) : '분석 시작'}
                </button>
            </div>

            {!results && (
                <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <span className="text-3xl mb-3 opacity-40">📊</span>
                    <p className="font-medium text-slate-500 dark:text-slate-400 text-sm m-0">버튼을 눌러 60~70세 시나리오를 비교하세요.</p>
                </div>
            )}

            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="p-4 sm:p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl shadow-sm">
                        <div className="flex items-start gap-4">
                            <span className="text-2xl mt-0.5">💡</span>
                            <div>
                                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 mt-0">분석 결과 요약</h4>
                                <ul className="text-sm font-medium text-indigo-800 dark:text-indigo-400/80 space-y-1.5 m-0 p-0 list-none">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        총 수령액 기준 최적: <strong className="text-indigo-700 dark:text-indigo-300 font-extrabold ml-1">{optimalPayoutAge}세</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        현재가치(NPV) 기준 최적: <strong className="text-indigo-700 dark:text-indigo-300 font-extrabold ml-1">{optimalNpvAge}세</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        은퇴 성공 확률 기준 최적: <strong className="text-indigo-700 dark:text-indigo-300 font-extrabold ml-1">{optimalSuccessAge}세</strong>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="h-72 p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-slate-100 dark:border-zinc-800/50">
                        <h5 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 text-center mt-0">수령 나이별 총 수령액 + 성공률</h5>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={results} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="age" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 100000000}억`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} domain={[0, 1]} />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === '총 수령액') return formatMoney(value);
                                        if (name === '성공 확률') return `${(value * 100).toFixed(1)}%`;
                                        return value;
                                    }}
                                    labelFormatter={(label) => `${label}세 수령`}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        color: '#0f172a'
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar yAxisId="left" dataKey="totalPayout" name="총 수령액" fill="#818cf8" barSize={24} radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="successRate" name="성공 확률" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
                        <table className="w-full text-sm text-right border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-400">
                                    <th className="p-3 text-center font-semibold text-xs uppercase tracking-wider">수령 나이</th>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider">총 수령액</th>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider">현재 가치(NPV)</th>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider">은퇴 성공률</th>
                                    <th className="p-3 text-center font-semibold text-xs uppercase tracking-wider">비고</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800">
                                {results.map((row) => {
                                    const isMaxPayout = row.age === optimalPayoutAge;
                                    const isMaxNpv = row.age === optimalNpvAge;
                                    const isMaxSuccess = row.age === optimalSuccessAge;
                                    return (
                                        <tr key={row.age} className={`hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors ${isMaxPayout || isMaxSuccess || isMaxNpv ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                            <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{row.age}세</td>
                                            <td className={`p-3 font-medium text-slate-600 dark:text-slate-400 ${isMaxPayout ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>{formatMoney(row.totalPayout)}</td>
                                            <td className={`p-3 font-medium text-slate-600 dark:text-slate-400 ${isMaxNpv ? 'text-purple-600 dark:text-purple-400 font-bold' : ''}`}>{formatMoney(row.npv)}</td>
                                            <td className={`p-3 font-medium text-slate-600 dark:text-slate-400 ${isMaxSuccess ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>{(row.successRate * 100).toFixed(1)}%</td>
                                            <td className="p-3 text-xs text-center flex items-center justify-center gap-1.5 flex-wrap">
                                                {isMaxPayout && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">최대 수령</span>}
                                                {isMaxNpv && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">최대 가치</span>}
                                                {isMaxSuccess && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">최고 확률</span>}
                                                {!isMaxPayout && !isMaxNpv && !isMaxSuccess && <span className="text-slate-400 dark:text-slate-600">-</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

