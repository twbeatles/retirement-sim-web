/**
 * Scenario Comparison Component
 * Allows comparing multiple saved scenarios in a single chart
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { SimulationResult } from "../logic/types";
import { requestSimulationBatch } from "../logic/simulationClient";
import { scenarioStorage, type SavedScenario } from "../services/storage";
import { buildComparisonChartData, getTrajectoryP50 } from "./scenario-comparison/helpers";
import { ComparisonResults } from "./scenario-comparison/ComparisonResults";
import { ScenarioSelector } from "./scenario-comparison/ScenarioSelector";
import { COMPARISON_COLORS, type ComparisonData } from "./scenario-comparison/types";

interface Props {
    currentResult: SimulationResult | null;
}

export function ScenarioComparison({ currentResult }: Props) {
    const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonError, setComparisonError] = useState<string | null>(null);

    const loadScenarios = useCallback(async (): Promise<SavedScenario[]> => {
        const scenarios = await scenarioStorage.getAllScenarios();
        setSavedScenarios(scenarios);
        setComparisonError(null);
        return scenarios;
    }, []);

    useEffect(() => {
        void loadScenarios().catch((error) => {
            setComparisonError("저장된 시나리오를 불러오지 못했습니다. 브라우저 저장소 설정을 확인해주세요.");
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

    const runComparison = async () => {
        setIsComparing(true);
        setComparisonError(null);

        try {
            // Refresh just-in-time to avoid stale scenario list during comparison.
            const latestScenarios = await loadScenarios();
            const results: ComparisonData[] = [];

            if (currentResult) {
                results.push({
                    id: "current",
                    name: "현재 설정",
                    color: COMPARISON_COLORS[0],
                    result: currentResult,
                    trajectory: getTrajectoryP50(currentResult)
                });
            }

            const selectedScenarios = selectedIds
                .map((id) => latestScenarios.find((scenario) => scenario.id === id))
                .filter((scenario): scenario is SavedScenario => !!scenario);

            if (selectedScenarios.length > 0) {
                const batchPlans = selectedScenarios.map((scenario) => ({
                    ...scenario.plan,
                    simulationSettings: {
                        ...scenario.plan.simulationSettings,
                        monteCarloPaths: Math.min(scenario.plan.simulationSettings.monteCarloPaths, 100)
                    }
                }));

                const batchResults = await requestSimulationBatch(batchPlans, {
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
                        color: COMPARISON_COLORS[(index + 1) % COMPARISON_COLORS.length],
                        result,
                        trajectory: getTrajectoryP50(result)
                    });
                });
            }

            setComparisonData(results);
        } catch (error) {
            setComparisonError("시나리오 비교를 완료하지 못했습니다. 저장된 시나리오를 확인한 뒤 다시 시도해주세요.");
            console.error("Scenario comparison failed:", error);
        } finally {
            setIsComparing(false);
        }
    };

    const chartData = useMemo(() => buildComparisonChartData(comparisonData), [comparisonData]);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-1 border-b border-transparent">📊 시나리오 비교</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
                현재 설정과 저장된 시나리오를 최대 5개까지 비교할 수 있습니다.
            </p>

            {comparisonError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
                    {comparisonError}
                </div>
            )}

            <ScenarioSelector
                scenarios={savedScenarios}
                selectedIds={selectedIds}
                isComparing={isComparing}
                onToggleScenario={toggleScenario}
                onRunComparison={runComparison}
            />
            <ComparisonResults comparisonData={comparisonData} chartData={chartData} />
        </div>
    );
}
