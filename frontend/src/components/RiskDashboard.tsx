/**
 * Risk Dashboard Component
 * Provides advanced risk analysis visualizations and controls
 */
import React, { useMemo, useState } from "react";
import {
    type DepletionAnalysis,
    type SensitivityResult,
    type SimulationInput,
    type SimulationResult
} from "../logic/types";
import { legacyInputToPlan } from "../logic/plan";
import { analyzeDepletion } from "../logic/riskAnalysis";
import { requestSensitivityAnalysis } from "../logic/simulationClient";
import {
    DepletionPanel,
    MedicalShockPanel,
    SensitivityPanel,
    SorrPanel,
} from "./risk-dashboard/RiskDashboardPanels";

interface Props {
    input: SimulationInput;
    result: SimulationResult | null;
    onInputChange: (input: SimulationInput) => void;
}

export const RiskDashboard = React.memo(function RiskDashboard({ input, result, onInputChange }: Props) {
    const [activeTab, setActiveTab] = useState<"depletion" | "sensitivity" | "sorr" | "medical">("depletion");
    const [runningAnalysis, setRunningAnalysis] = useState(false);
    const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[]>([]);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const depletionAnalysis = useMemo<DepletionAnalysis | null>(() => {
        if (!result) {
            return null;
        }
        return analyzeDepletion(result);
    }, [result]);

    const handleRunSensitivity = async () => {
        setRunningAnalysis(true);
        setAnalysisError(null);
        try {
            const variations = [-0.02, -0.01, 0, 0.01, 0.02];
            const [returnResult, inflationResult] = await Promise.all([
                requestSensitivityAnalysis(legacyInputToPlan(input), "annual_return", variations),
                requestSensitivityAnalysis(legacyInputToPlan(input), "annual_inflation", variations)
            ]);
            setSensitivityResults([returnResult, inflationResult]);
        } catch (error) {
            setAnalysisError("민감도 분석을 완료하지 못했습니다. 입력값을 확인한 뒤 다시 시도해주세요.");
            console.error("Sensitivity analysis failed:", error);
        } finally {
            setRunningAnalysis(false);
        }
    };

    const toggleMedicalShock = (enabled: boolean) => {
        onInputChange({
            ...input,
            medical_shocks: {
                ...input.medical_shocks,
                enabled,
                occurrences: input.medical_shocks?.occurrences || []
            }
        });
    };

    const addMedicalShock = () => {
        const occurrences = input.medical_shocks?.occurrences || [];
        onInputChange({
            ...input,
            medical_shocks: {
                enabled: true,
                occurrences: [...occurrences, { age: 70, amount: 50000000, description: "의료비 이벤트" }]
            }
        });
    };

    const removeMedicalShock = (index: number) => {
        const occurrences = [...(input.medical_shocks?.occurrences || [])];
        occurrences.splice(index, 1);
        onInputChange({
            ...input,
            medical_shocks: {
                enabled: occurrences.length > 0,
                occurrences
            }
        });
    };

    const updateMedicalShock = (index: number, field: "age" | "amount" | "description", value: string | number) => {
        const occurrences = [...(input.medical_shocks?.occurrences || [])];
        occurrences[index] = { ...occurrences[index], [field]: value };
        onInputChange({
            ...input,
            medical_shocks: { enabled: true, occurrences }
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">리스크 분석 📈</h3>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b-2 border-slate-100 dark:border-zinc-800">
                {[
                    { id: "depletion", label: "자산 고갈 분석" },
                    { id: "sensitivity", label: "민감도 분석" },
                    { id: "sorr", label: "수익률 순서 리스크" },
                    { id: "medical", label: "의료비 쇼크" }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "depletion" && (
                <DepletionPanel depletionAnalysis={depletionAnalysis} />
            )}

            {activeTab === "sensitivity" && (
                <SensitivityPanel
                    runningAnalysis={runningAnalysis}
                    sensitivityResults={sensitivityResults}
                    analysisError={analysisError}
                    onRunSensitivity={handleRunSensitivity}
                />
            )}

            {activeTab === "sorr" && (
                <SorrPanel input={input} onInputChange={onInputChange} />
            )}

            {activeTab === "medical" && (
                <MedicalShockPanel
                    input={input}
                    onToggleMedicalShock={toggleMedicalShock}
                    onAddMedicalShock={addMedicalShock}
                    onRemoveMedicalShock={removeMedicalShock}
                    onUpdateMedicalShock={updateMedicalShock}
                />
            )}
        </div>
    );
});
