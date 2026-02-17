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
        <div className="card">
            <h3 className="card-header">Risk Dashboard</h3>

            <div className="risk-tabs mb-4">
                {[
                    { id: "depletion", label: "Depletion" },
                    { id: "sensitivity", label: "Sensitivity" },
                    { id: "sorr", label: "Sequence Risk" },
                    { id: "medical", label: "Medical Shock" }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`risk-tab ${activeTab === tab.id ? "active" : ""}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "depletion" && (
                <div>
                    <p className="text-sub text-sm mb-4">Distribution of asset depletion timing across simulation paths.</p>
                    {depletionAnalysis ? (
                        <>
                            <div className="summary-grid risk-summary-grid mb-4">
                                <div className="summary-card risk-summary-success">
                                    <div className="summary-title">Never depleted</div>
                                    <div className="summary-value text-success">
                                        {(depletionAnalysis.neverDepletedRate * 100).toFixed(1)}%
                                    </div>
                                </div>
                                {depletionAnalysis.medianDepletionAge && (
                                    <div className="summary-card risk-summary-warning">
                                        <div className="summary-title">Median depletion age</div>
                                        <div className="summary-value text-warning">
                                            {Math.round(depletionAnalysis.medianDepletionAge)}y
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="chart-box chart-box-sm">
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
                        <div className="text-center text-sub p-4">
                            Depletion analysis is available in Monte Carlo mode.
                        </div>
                    )}
                </div>
            )}

            {activeTab === "sensitivity" && (
                <div>
                    <p className="text-sub text-sm mb-4">
                        Parameter sensitivity for success rate.
                        <Tooltip content="Runs worker-based comparisons over ±2% parameter shifts." />
                    </p>
                    <button onClick={handleRunSensitivity} disabled={runningAnalysis} className="btn btn-primary mb-4">
                        {runningAnalysis ? "Analyzing..." : "Run sensitivity"}
                    </button>

                    {sensitivityResults.length > 0 && (
                        <div className="chart-box chart-box-md">
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
                <div>
                    <p className="text-sub text-sm mb-4">
                        <strong>Sequence-of-returns risk</strong>
                        <Tooltip content="Early-retirement drawdowns can be more damaging than late drawdowns." />
                    </p>
                    <div className="info-box risk-info-box">
                        <strong>Tip:</strong> Increasing defensive allocation in the first few retirement years can reduce this risk.
                    </div>
                    <div className="mt-2">
                        <label className="checkbox-label font-bold">
                            <input
                                type="checkbox"
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
                <div>
                    <p className="text-sub text-sm mb-4">
                        Add one-time medical expense shocks at specific ages.
                    </p>

                    <div className="mb-4">
                        <label className="checkbox-label font-bold">
                            <input
                                type="checkbox"
                                checked={input.medical_shocks?.enabled ?? false}
                                onChange={(event) => toggleMedicalShock(event.target.checked)}
                            />
                            Enable medical shocks
                        </label>
                    </div>

                    {input.medical_shocks?.enabled && (
                        <>
                            {input.medical_shocks.occurrences.map((shock, index) => (
                                <div key={index} className="flex-row gap-2 mb-2">
                                    <input
                                        type="number"
                                        className="input risk-w-70"
                                        value={shock.age}
                                        onChange={(event) => updateMedicalShock(index, "age", Number(event.target.value))}
                                        placeholder="Age"
                                    />
                                    <span className="text-sub">at</span>
                                    <input
                                        type="number"
                                        className="input risk-w-140"
                                        value={shock.amount}
                                        onChange={(event) => updateMedicalShock(index, "amount", Number(event.target.value))}
                                        placeholder="Amount"
                                    />
                                    <span className="text-sub">KRW</span>
                                    <input
                                        type="text"
                                        className="input flex-1"
                                        value={shock.description || ""}
                                        onChange={(event) => updateMedicalShock(index, "description", event.target.value)}
                                        placeholder="Description"
                                    />
                                    <button
                                        onClick={() => removeMedicalShock(index)}
                                        className="btn btn-sm scenario-delete-btn"
                                    >
                                        X
                                    </button>
                                </div>
                            ))}
                            <button onClick={addMedicalShock} className="btn btn-secondary btn-sm mt-2">
                                + Add shock
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
