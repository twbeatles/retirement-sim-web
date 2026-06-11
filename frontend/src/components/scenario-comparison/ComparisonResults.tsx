import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { ChartPoint, ComparisonData } from "./types";

type ComparisonResultsProps = {
    comparisonData: ComparisonData[];
    chartData: ChartPoint[];
};

export function ComparisonResults({ comparisonData, chartData }: ComparisonResultsProps) {
    if (comparisonData.length === 0) {
        return null;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700 mb-6">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-zinc-700">
                            <th className="p-3 font-semibold text-xs uppercase tracking-wider">시나리오</th>
                            <th className="p-3 font-semibold text-xs uppercase tracking-wider text-right">성공률</th>
                            <th className="p-3 font-semibold text-xs uppercase tracking-wider text-right">최종 실질 자산 (중간값)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800">
                        {comparisonData.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                    {item.name}
                                </td>
                                <td className={`p-3 font-bold text-right ${item.result.summary.successRate > 0.8 ? "text-emerald-600 dark:text-emerald-400" : item.result.summary.successRate > 0.5 ? "text-amber-500 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                                    {(item.result.summary.successRate * 100).toFixed(1)}%
                                </td>
                                <td className="p-3 font-medium text-slate-600 dark:text-slate-400 text-right">
                                    {Math.round(
                                        (item.result.mode === "deterministic"
                                            ? item.result.summary.finalTotalAssetsReal
                                            : item.result.summary.terminalStats.totalAssetsReal.p50) / 10000
                                    ).toLocaleString()}만원
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="h-80 w-full p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-slate-100 dark:border-zinc-800/50">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 mt-0">시간에 따른 총 자산 추이 (중간값)</p>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis
                            dataKey="month"
                            tickFormatter={(m) => `${Math.floor(m / 12)}년`}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                        />
                        <YAxis
                            tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString()}만`}
                            width={70}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            formatter={(v: number) => `${Math.round(v / 10000).toLocaleString()}만원`}
                            labelFormatter={(m) => `${Math.floor(Number(m) / 12)}년`}
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
                        {comparisonData.map((item) => (
                            <Line
                                key={item.id}
                                type="monotone"
                                dataKey={item.id}
                                name={item.name}
                                stroke={item.color}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
