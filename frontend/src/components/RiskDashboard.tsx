/**
 * Risk Dashboard Component
 * Provides advanced risk analysis visualizations and controls
 */
import React, { useMemo, useState } from "react";
import {
    DepletionAnalysis,
    SensitivityResult,
    SimulationInput,
    SimulationResult
} from "../logic/types";
import { analyzeDepletion } from "../logic/riskAnalysis";
import { requestSensitivityAnalysis } from "../logic/simulationClient";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis
} from "recharts";
import { Tooltip } from "./Tooltip";

interface Props {
    input: SimulationInput;
    result: SimulationResult | null;
    onInputChange: (input: SimulationInput) => void;
}

export function RiskDashboard({ input, result, onInputChange }: Props) {
    const [activeTab, setActiveTab] = useState<"depletion" | "sensitivity" | "sorr" | "medical">("depletion");
    const [runningAnalysis, setRunningAnalysis] = useState(false);
    const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[]>([]);

    const depletionAnalysis = useMemo<DepletionAnalysis | null>(() => {
        if (!result) {
            return null;
        }
        return analyzeDepletion(result);
    }, [result]);

    const handleRunSensitivity = async () => {
        setRunningAnalysis(true);
        try {
            const variations = [-0.02, -0.01, 0, 0.01, 0.02];
            const [returnResult, inflationResult] = await Promise.all([
                requestSensitivityAnalysis(input, "annual_return", variations),
                requestSensitivityAnalysis(input, "annual_inflation", variations)
            ]);
            setSensitivityResults([returnResult, inflationResult]);
        } catch (error) {
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
                occurrences: [...occurrences, { age: 70, amount: 50000000, description: "Medical event" }]
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
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">Risk Dashboard</h3>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b-2 border-slate-100 dark:border-zinc-800">
                {[
                    { id: "depletion", label: "Depletion" },
                    { id: "sensitivity", label: "Sensitivity" },
                    { id: "sorr", label: "Sequence Risk" },
                    { id: "medical", label: "Medical Shock" }
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
                <div className="animate-in fade-in duration-300">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Distribution of asset depletion timing across simulation paths.</p>
                    {depletionAnalysis ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Never depleted</div>
                                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-500">
                                        {(depletionAnalysis.neverDepletedRate * 100).toFixed(1)}%
                                    </div>
                                </div>
                                {depletionAnalysis.medianDepletionAge && (
                                    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-orange-700 dark:text-orange-400 mb-1">Median depletion age</div>
                                        <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-500">
                                            {Math.round(depletionAnalysis.medianDepletionAge)}y
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={depletionAnalysis.histogram.filter((bucket) => bucket.count > 0)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="ageRange" />
                                        <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                                        <RechartsTooltip formatter={(value: any) => `${(value * 100).toFixed(1)}%`} />
                                        <Bar dataKey="percentage" fill="var(--primary)" name="Rate" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                            Depletion analysis is available in Monte Carlo mode.
                        </div>
                    )}
                </div>
            )}

            {activeTab === "sensitivity" && (
                <div className="animate-in fade-in duration-300">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-2">
                        Parameter sensitivity for success rate.
                        <Tooltip content="Runs worker-based comparisons over ±2% parameter shifts." />
                    </p>
                    <button onClick={handleRunSensitivity} disabled={runningAnalysis} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-4">
                        {runningAnalysis ? "Analyzing..." : "Run sensitivity"}
                    </button>

                    {sensitivityResults.length > 0 && (
                        <div className="h-80 w-full mt-4">
                            <ResponsiveContainer>
                                <LineChart>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="value"
                                        type="number"
                                        domain={["auto", "auto"]}
                                        tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                        domain={[0, 1]}
                                    />
                                    <RechartsTooltip
                                        formatter={(value: any) => `${(value * 100).toFixed(1)}%`}
                                        labelFormatter={(value) => `Input: ${(Number(value) * 100).toFixed(2)}%`}
                                    />
                                    <Legend />
                                    {sensitivityResults.map((series, index) => (
                                        <Line
                                            key={series.parameter}
                                            data={series.testValues.map((value, seriesIndex) => ({
                                                value,
                                                rate: series.successRates[seriesIndex]
                                            }))}
                                            dataKey="rate"
                                            name={series.parameter === "annual_return" ? "Return" : "Inflation"}
                                            stroke={index === 0 ? "var(--primary)" : "var(--warning)"}
                                            strokeWidth={2}
                                            dot
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "sorr" && (
                <div className="animate-in fade-in duration-300">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-slate-100">Sequence-of-returns risk</strong>
                        <Tooltip content="Early-retirement drawdowns can be more damaging than late drawdowns." />
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-3 flex items-start gap-2 mt-2 text-sm text-blue-800 dark:text-blue-300">
                        <strong>Tip:</strong> Increasing defensive allocation in the first few retirement years can reduce this risk.
                    </div>
                    <div className="mt-6 flex items-center">
                        <label className="flex items-center gap-3 text-sm cursor-pointer font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 group">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800 transition-transform cursor-pointer group-hover:scale-110"
                                checked={input.stress_test?.enabled ?? false}
                                onChange={(event) =>
                                    onInputChange({
                                        ...input,
                                        stress_test: {
                                            ...(input.stress_test ?? {
                                                startFromRetirement: true,
                                                durationMonths: 60,
                                                annualDeclineRate: 0.15
                                            }),
                                            enabled: event.target.checked
                                        }
                                    })
                                }
                            />
                            Enable early-retirement stress scenario
                        </label>
                    </div>
                </div>
            )}

            {activeTab === "medical" && (
                <div className="animate-in fade-in duration-300">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                        Add one-time medical expense shocks at specific ages.
                    </p>

                    <div className="mb-6 flex items-center">
                        <label className="flex items-center gap-3 text-sm cursor-pointer font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 group">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800 transition-transform cursor-pointer group-hover:scale-110"
                                checked={input.medical_shocks?.enabled ?? false}
                                onChange={(event) => toggleMedicalShock(event.target.checked)}
                            />
                            Enable medical shocks
                        </label>
                    </div>

                    {input.medical_shocks?.enabled && (
                        <div className="flex flex-col gap-3">
                            {input.medical_shocks.occurrences.map((shock, index) => (
                                <div key={index} className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 p-2 lg:p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                                    <input
                                        type="number"
                                        className="w-20 lg:w-24 px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        value={shock.age}
                                        onChange={(event) => updateMedicalShock(index, "age", Number(event.target.value))}
                                        placeholder="Age"
                                    />
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">세에</span>
                                    <input
                                        type="number"
                                        className="w-32 lg:w-40 px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        value={shock.amount}
                                        onChange={(event) => updateMedicalShock(index, "amount", Number(event.target.value))}
                                        placeholder="Amount"
                                    />
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">KRW 발생:</span>
                                    <input
                                        type="text"
                                        className="flex-1 min-w-[120px] px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        value={shock.description || ""}
                                        onChange={(event) => updateMedicalShock(index, "description", event.target.value)}
                                        placeholder="설명 (예: 수술비)"
                                    />
                                    <button
                                        onClick={() => removeMedicalShock(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                        aria-label="항목 삭제"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button onClick={addMedicalShock} className="self-start mt-2 inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer">
                                + 항목 추가
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
