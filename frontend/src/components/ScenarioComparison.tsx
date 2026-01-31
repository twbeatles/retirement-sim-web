/**
 * Scenario Comparison Component
 * Allows comparing multiple saved scenarios in a single chart
 */
import React, { useState, useMemo, useEffect } from 'react';
import { SimulationInput, SimulationResult, SimulationSummary } from '../logic/types';
import { runSimulation } from '../logic/engine';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const STORAGE_KEY = "retirement_sim_scenarios_v1";
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

type SavedScenario = {
    id: string;
    name: string;
    date: string;
    data: SimulationInput;
};

interface ComparisonData {
    id: string;
    name: string;
    color: string;
    result: SimulationResult;
    trajectory: { month: number; value: number }[];
}

interface Props {
    currentInput: SimulationInput;
    currentResult: SimulationResult | null;
}

export function ScenarioComparison({ currentInput, currentResult }: Props) {
    const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [isComparing, setIsComparing] = useState(false);

    // Load saved scenarios
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setSavedScenarios(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load scenarios", e);
            }
        }
    }, []);

    // Toggle scenario selection
    const toggleScenario = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id].slice(0, 5) // Max 5 scenarios
        );
    };

    // Run comparison
    const runComparison = () => {
        setIsComparing(true);

        setTimeout(() => {
            const results: ComparisonData[] = [];

            // Add current scenario
            if (currentResult) {
                const trajectory = getTrajectoryP50(currentResult);
                results.push({
                    id: 'current',
                    name: '현재 설정',
                    color: COLORS[0],
                    result: currentResult,
                    trajectory
                });
            }

            // Add selected saved scenarios
            selectedIds.forEach((id, idx) => {
                const scenario = savedScenarios.find(s => s.id === id);
                if (scenario) {
                    const result = runSimulation({
                        ...scenario.data,
                        simulation_settings: {
                            ...scenario.data.simulation_settings,
                            mc_paths: Math.min(scenario.data.simulation_settings.mc_paths, 100) // Speed optimization
                        }
                    });
                    const trajectory = getTrajectoryP50(result);
                    results.push({
                        id,
                        name: scenario.name,
                        color: COLORS[(idx + 1) % COLORS.length],
                        result,
                        trajectory
                    });
                }
            });

            setComparisonData(results);
            setIsComparing(false);
        }, 100);
    };

    // Extract P50 trajectory from result
    const getTrajectoryP50 = (result: SimulationResult): { month: number; value: number }[] => {
        if (result.mode === 'montecarlo' && result.trajectoryStats) {
            return result.trajectoryStats.month.map((m, i) => ({
                month: m,
                value: result.trajectoryStats!.p50[i]
            }));
        } else if (result.mode === 'deterministic') {
            return result.timeline.map(r => ({
                month: r.month,
                value: r.totalAssetsReal
            }));
        }
        return [];
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        if (comparisonData.length === 0) return [];

        const maxLength = Math.max(...comparisonData.map(c => c.trajectory.length));
        const data: any[] = [];

        for (let i = 0; i < maxLength; i += 12) { // Sample yearly
            const point: any = { month: i };
            comparisonData.forEach(c => {
                const value = c.trajectory.find(t => t.month === i);
                point[c.id] = value?.value;
            });
            data.push(point);
        }

        return data;
    }, [comparisonData]);

    return (
        <div className="card">
            <h3 className="card-header">📈 시나리오 비교</h3>
            <p className="text-sub text-sm mb-4">
                저장된 시나리오들을 선택하여 자산 추이를 비교합니다.
            </p>

            {savedScenarios.length === 0 ? (
                <div className="text-center text-sub p-4">
                    저장된 시나리오가 없습니다. 먼저 시나리오를 저장해주세요.
                </div>
            ) : (
                <>
                    <div className="flex-col mb-4">
                        <div className="text-sm font-bold mb-2">비교할 시나리오 선택 (최대 5개)</div>
                        {savedScenarios.map(s => (
                            <label key={s.id} className="checkbox-label text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(s.id)}
                                    onChange={() => toggleScenario(s.id)}
                                />
                                {s.name} <span className="text-sub">({s.date})</span>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={runComparison}
                        disabled={isComparing}
                        className="btn btn-primary mb-4"
                    >
                        {isComparing ? '비교 중...' : '📊 비교 실행'}
                    </button>

                    {comparisonData.length > 0 && (
                        <>
                            {/* Summary Table */}
                            <div className="table-container mb-4">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>시나리오</th>
                                            <th>성공 확률</th>
                                            <th>최종 자산 (중위)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonData.map(c => (
                                            <tr key={c.id}>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        width: 12,
                                                        height: 12,
                                                        background: c.color,
                                                        borderRadius: '50%',
                                                        marginRight: 8
                                                    }} />
                                                    {c.name}
                                                </td>
                                                <td style={{
                                                    color: c.result.summary.successRate > 0.8 ? 'var(--success)' :
                                                        c.result.summary.successRate > 0.5 ? 'var(--warning)' : 'var(--danger)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {(c.result.summary.successRate * 100).toFixed(1)}%
                                                </td>
                                                <td>
                                                    {Math.round(c.result.summary.finalTotalAssetsReal / 10000).toLocaleString()}만원
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Comparison Chart */}
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="month"
                                            tickFormatter={(m) => `${Math.floor(m / 12)}년`}
                                        />
                                        <YAxis
                                            tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString()}만`}
                                            width={70}
                                        />
                                        <Tooltip
                                            formatter={(v: any) => `${Math.round(v / 10000).toLocaleString()}만원`}
                                            labelFormatter={(m) => `${Math.floor(Number(m) / 12)}년차`}
                                        />
                                        <Legend />
                                        {comparisonData.map(c => (
                                            <Line
                                                key={c.id}
                                                type="monotone"
                                                dataKey={c.id}
                                                name={c.name}
                                                stroke={c.color}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
