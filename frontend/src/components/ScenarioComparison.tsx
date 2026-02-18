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
                    includeSampleTimelines: false
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
        <div className="card">
            <h3 className="card-header">Scenario Comparison</h3>
            <p className="text-sub text-sm mb-4">
                Compare up to 5 saved scenarios against the current setup.
            </p>

            {savedScenarios.length === 0 ? (
                <div className="text-center text-sub p-4">
                    No saved scenarios found.
                </div>
            ) : (
                <>
                    <div className="flex-col mb-4">
                        <div className="text-sm font-bold mb-2">Select scenarios (max 5)</div>
                        {savedScenarios.map((scenario) => (
                            <label key={scenario.id} className="checkbox-label text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(scenario.id)}
                                    onChange={() => toggleScenario(scenario.id)}
                                />
                                {scenario.name}{" "}
                                <span className="text-sub">({new Date(scenario.updatedAt).toLocaleDateString()})</span>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={runComparison}
                        disabled={isComparing}
                        className="btn btn-primary mb-4"
                    >
                        {isComparing ? "Comparing..." : "Run comparison"}
                    </button>

                    {comparisonData.length > 0 && (
                        <>
                            <div className="table-container mb-4">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Scenario</th>
                                            <th>Success rate</th>
                                            <th>Final real assets (median)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonData.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <span className={`comparison-color-dot ${COLOR_CLASS_MAP[item.color] || ""}`} />
                                                    {item.name}
                                                </td>
                                                <td className={`comparison-rate-cell ${item.result.summary.successRate > 0.8 ? "text-success" : item.result.summary.successRate > 0.5 ? "text-warning" : "text-danger"}`}>
                                                    {(item.result.summary.successRate * 100).toFixed(1)}%
                                                </td>
                                                <td>
                                                    {Math.round(item.result.summary.finalTotalAssetsReal / 10000).toLocaleString()}만원
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="chart-box chart-box-lg">
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="month"
                                            tickFormatter={(m) => `${Math.floor(m / 12)}y`}
                                        />
                                        <YAxis
                                            tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString()}만`}
                                            width={70}
                                        />
                                        <Tooltip
                                            formatter={(v: number) => `${Math.round(v / 10000).toLocaleString()}만원`}
                                            labelFormatter={(m) => `${Math.floor(Number(m) / 12)}y`}
                                        />
                                        <Legend />
                                        {comparisonData.map((item) => (
                                            <Line
                                                key={item.id}
                                                type="monotone"
                                                dataKey={item.id}
                                                name={item.name}
                                                stroke={item.color}
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
