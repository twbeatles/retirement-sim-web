/**
 * Scenario Comparison Component
 * Allows comparing multiple saved scenarios in a single chart
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { SimulationResult } from "../logic/types";
import { requestSimulationBatch } from "../logic/simulationClient";
import { scenarioStorage, type SavedScenario } from "../services/storage";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F", "#FFBB28"];
const COLOR_CLASS_MAP: Record<string, string> = {
    "#8884d8": "comparison-color-0",
    "#82ca9d": "comparison-color-1",
    "#ffc658": "comparison-color-2",
    "#ff7300": "comparison-color-3",
    "#00C49F": "comparison-color-4",
    "#FFBB28": "comparison-color-5"
};

type ComparisonData = {
    id: string;
    name: string;
    color: string;
    result: SimulationResult;
    trajectory: { month: number; value: number }[];
};

type ChartPoint = {
    month: number;
    [seriesId: string]: number | undefined;
};

interface Props {
    currentResult: SimulationResult | null;
}

export function ScenarioComparison({ currentResult }: Props) {
    const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [isComparing, setIsComparing] = useState(false);

    const loadScenarios = useCallback(async (): Promise<SavedScenario[]> => {
        const scenarios = await scenarioStorage.getAllScenarios();
        setSavedScenarios(scenarios);
        return scenarios;
    }, []);

    useEffect(() => {
        void loadScenarios().catch((error) => {
            console.error("Failed to load scenarios", error);
        });
    }, [loadScenarios]);

    const toggleScenario = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id].slice(0, 5)
        );
    };

    const getTrajectoryP50 = (result: SimulationResult): { month: number; value: number }[] => {
        if (result.mode === "montecarlo" && result.trajectoryStats) {
            return result.trajectoryStats.month.map((month, index) => ({
                month,
                value: result.trajectoryStats!.p50[index]
            }));
        }

        if (result.mode === "montecarlo" && result.sampleTimelines.length > 0) {
            return result.sampleTimelines[0].map((row) => ({
                month: row.month,
                value: row.totalAssetsReal
            }));
        }

        if (result.mode === "deterministic") {
            return result.timeline.map((row) => ({
                month: row.month,
                value: row.totalAssetsReal
            }));
        }

        return [];
    };

    const runComparison = async () => {
        setIsComparing(true);

        try {
            // Refresh just-in-time to avoid stale scenario list during comparison.
            const latestScenarios = await loadScenarios();
            const results: ComparisonData[] = [];

            if (currentResult) {
                results.push({
                    id: "current",
                    name: "현재 설정",
                    color: COLORS[0],
                    result: currentResult,
                    trajectory: getTrajectoryP50(currentResult)
                });
            }

            const selectedScenarios = selectedIds
                .map((id) => latestScenarios.find((scenario) => scenario.id === id))
                .filter((scenario): scenario is SavedScenario => !!scenario);

            if (selectedScenarios.length > 0) {
                const batchInputs = selectedScenarios.map((scenario) => ({
                    ...scenario.input,
                    simulation_settings: {
                        ...scenario.input.simulation_settings,
                        mc_paths: Math.min(scenario.input.simulation_settings.mc_paths, 100)
                    }
                }));

                const batchResults = await requestSimulationBatch(batchInputs, {
                    detailLevel: "full",
                    includeSampleTimelines: false,
                    includeTrajectoryStats: true,
                    includeSurvivalSeries: false,
                    maxSampleTimelines: 0
                });

                batchResults.forEach((result, index) => {
                    const scenario = selectedScenarios[index];
                    results.push({
                        id: `scenario-${scenario.id}`,
                        name: scenario.name,
                        color: COLORS[(index + 1) % COLORS.length],
                        result,
                        trajectory: getTrajectoryP50(result)
                    });
                });
            }

            setComparisonData(results);
        } catch (error) {
            console.error("Scenario comparison failed:", error);
        } finally {
            setIsComparing(false);
        }
    };

    const chartData = useMemo<ChartPoint[]>(() => {
        if (comparisonData.length === 0) return [];

        const maxLength = Math.max(...comparisonData.map((item) => item.trajectory.length));
        const data: ChartPoint[] = [];

        for (let month = 0; month < maxLength; month += 12) {
            const point: ChartPoint = { month };
            comparisonData.forEach((item) => {
                const value = item.trajectory.find((t) => t.month === month);
                point[item.id] = value?.value;
            });
            data.push(point);
        }

        return data;
    }, [comparisonData]);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-1 border-b border-transparent">📊 시나리오 비교</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
                현재 설정과 저장된 시나리오를 최대 5개까지 비교할 수 있습니다.
            </p>

            {savedScenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <span className="text-3xl mb-3 opacity-40">📁</span>
                    <p className="font-medium text-slate-500 dark:text-slate-400 text-sm m-0">저장된 시나리오가 없습니다.</p>
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col gap-3 mb-6 p-4 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50/50 dark:bg-zinc-800/30">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span>📌</span> 시나리오 선택 (최대 5개)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {savedScenarios.map((scenario) => (
                                <label key={scenario.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors group/cb">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                        checked={selectedIds.includes(scenario.id)}
                                        onChange={() => toggleScenario(scenario.id)}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover/cb:text-slate-900 dark:group-hover/cb:text-white truncate">
                                            {scenario.name}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            ({new Date(scenario.updatedAt).toLocaleDateString()})
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={runComparison}
                        disabled={isComparing || selectedIds.length === 0}
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-700 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm disabled:cursor-not-allowed cursor-pointer mb-6"
                    >
                        {isComparing ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                비교 중...
                            </div>
                        ) : "비교 실행"}
                    </button>

                    {comparisonData.length > 0 && (
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
                                                    {Math.round(item.result.summary.finalTotalAssetsReal / 10000).toLocaleString()}만원
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
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
