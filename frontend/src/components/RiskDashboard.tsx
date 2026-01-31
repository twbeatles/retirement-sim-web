/**
 * Risk Dashboard Component
 * Provides advanced risk analysis visualizations and controls
 */
import React, { useState, useMemo } from 'react';
import { SimulationInput, SimulationResult, SensitivityResult, DepletionAnalysis } from '../logic/types';
import { analyzeDepletion, runSensitivityAnalysis, analyzeSoRR } from '../logic/riskAnalysis';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Tooltip } from './Tooltip';

interface Props {
    input: SimulationInput;
    result: SimulationResult | null;
    onInputChange: (input: SimulationInput) => void;
}

export function RiskDashboard({ input, result, onInputChange }: Props) {
    const [activeTab, setActiveTab] = useState<'depletion' | 'sensitivity' | 'sorr' | 'medical'>('depletion');
    const [runningAnalysis, setRunningAnalysis] = useState(false);
    const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[]>([]);

    // Depletion Analysis (from current result)
    const depletionAnalysis = useMemo<DepletionAnalysis | null>(() => {
        if (!result) return null;
        return analyzeDepletion(result);
    }, [result]);

    // Run sensitivity analysis on demand
    const handleRunSensitivity = () => {
        setRunningAnalysis(true);
        setTimeout(() => {
            const variations = [-0.02, -0.01, 0, 0.01, 0.02]; // ±2%, ±1%
            const returnResult = runSensitivityAnalysis(input, 'annual_return', variations);
            const inflationResult = runSensitivityAnalysis(input, 'annual_inflation', variations);
            setSensitivityResults([returnResult, inflationResult]);
            setRunningAnalysis(false);
        }, 100);
    };

    // Medical Shock Toggle
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
                occurrences: [...occurrences, { age: 70, amount: 50000000, description: '의료비' }]
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

    const updateMedicalShock = (index: number, field: 'age' | 'amount' | 'description', value: any) => {
        const occurrences = [...(input.medical_shocks?.occurrences || [])];
        occurrences[index] = { ...occurrences[index], [field]: value };
        onInputChange({
            ...input,
            medical_shocks: { enabled: true, occurrences }
        });
    };

    return (
        <div className="card">
            <h3 className="card-header">📊 리스크 분석 대시보드</h3>

            {/* Tab Navigation */}
            <div className="flex-row mb-4" style={{ borderBottom: '1px solid var(--border)', gap: 0 }}>
                {[
                    { id: 'depletion', label: '자금 고갈 분석' },
                    { id: 'sensitivity', label: '민감도 분석' },
                    { id: 'sorr', label: '수익률 순서 위험' },
                    { id: 'medical', label: '의료비 충격' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                            padding: '8px 16px',
                            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                            color: activeTab === tab.id ? 'white' : 'var(--text-sub)',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'depletion' && (
                <div>
                    <p className="text-sub text-sm mb-4">
                        몬테카를로 시뮬레이션 경로별 자금 고갈 시점 분포입니다.
                    </p>
                    {depletionAnalysis ? (
                        <>
                            <div className="summary-grid mb-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <div className="summary-card" style={{ borderLeftColor: 'var(--success)' }}>
                                    <div className="summary-title">고갈 없음 비율</div>
                                    <div className="summary-value" style={{ color: 'var(--success)' }}>
                                        {(depletionAnalysis.neverDepletedRate * 100).toFixed(1)}%
                                    </div>
                                </div>
                                {depletionAnalysis.medianDepletionAge && (
                                    <div className="summary-card" style={{ borderLeftColor: 'var(--warning)' }}>
                                        <div className="summary-title">고갈 시 중위 연령</div>
                                        <div className="summary-value" style={{ color: 'var(--warning)' }}>
                                            {Math.round(depletionAnalysis.medianDepletionAge)}세
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={depletionAnalysis.histogram.filter(h => h.count > 0)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="ageRange" />
                                        <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                                        <RechartsTooltip formatter={(v: any) => `${(v * 100).toFixed(1)}%`} />
                                        <Bar dataKey="percentage" fill="var(--primary)" name="비율" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-sub p-4">
                            몬테카를로 모드에서만 분석 가능합니다.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'sensitivity' && (
                <div>
                    <p className="text-sub text-sm mb-4">
                        주요 파라미터 변화에 따른 성공 확률 변화를 분석합니다.
                        <Tooltip content="수익률이나 물가상승률이 예상보다 높거나 낮을 때, 은퇴 성공 확률이 얼마나 민감하게 변하는지 확인합니다." />
                    </p>
                    <button
                        onClick={handleRunSensitivity}
                        disabled={runningAnalysis}
                        className="btn btn-primary mb-4"
                    >
                        {runningAnalysis ? '분석 중...' : '🔍 민감도 분석 실행'}
                    </button>

                    {sensitivityResults.length > 0 && (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="value"
                                        type="number"
                                        domain={['auto', 'auto']}
                                        tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                                    />
                                    <YAxis
                                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                                        domain={[0, 1]}
                                    />
                                    <RechartsTooltip
                                        formatter={(v: any) => `${(v * 100).toFixed(1)}%`}
                                        labelFormatter={(v) => `변경값: ${(Number(v) * 100).toFixed(2)}%`}
                                    />
                                    <Legend />
                                    {sensitivityResults.map((sr, i) => (
                                        <Line
                                            key={sr.parameter}
                                            data={sr.testValues.map((v, j) => ({
                                                value: v,
                                                rate: sr.successRates[j]
                                            }))}
                                            dataKey="rate"
                                            name={sr.parameter === 'annual_return' ? '수익률' : '인플레이션'}
                                            stroke={i === 0 ? 'var(--primary)' : 'var(--warning)'}
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

            {activeTab === 'sorr' && (
                <div>
                    <p className="text-sub text-sm mb-4">
                        <strong>수익률 순서 위험 (Sequence of Returns Risk)</strong>
                        <Tooltip content="은퇴 초기에 자산 가치가 급락하면, 이후 시장이 회복되더라도 자산이 회복 불가능한 수준으로 고갈될 위험을 의미합니다. 은퇴 준비에서 가장 치명적인 리스크 중 하나입니다." />
                    </p>
                    <div className="info-box" style={{
                        background: 'var(--warning-bg)',
                        border: '1px solid var(--warning-border)',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius)',
                        marginBottom: '16px'
                    }}>
                        <strong>💡 시사점</strong>: 은퇴 직후 5년간 채권 비중을 높이거나, 버킷 전략을
                        사용하면 이 위험을 줄일 수 있습니다.
                    </div>
                    <div className="mt-2">
                        <label className="checkbox-label font-bold">
                            <input
                                type="checkbox"
                                checked={input.stress_test?.enabled ?? false}
                                onChange={e => onInputChange({
                                    ...input,
                                    stress_test: {
                                        ...(input.stress_test ?? { startFromRetirement: true, durationMonths: 60, annualDeclineRate: 0.15 }),
                                        enabled: e.target.checked
                                    }
                                })}
                            />
                            은퇴 초기 폭락 시나리오 적용
                        </label>
                    </div>
                </div>
            )}

            {activeTab === 'medical' && (
                <div>
                    <p className="text-sub text-sm mb-4">
                        특정 연령에 큰 의료비/간병비 지출이 발생하는 시나리오를 설정합니다.
                    </p>

                    <div className="mb-4">
                        <label className="checkbox-label font-bold">
                            <input
                                type="checkbox"
                                checked={input.medical_shocks?.enabled ?? false}
                                onChange={e => toggleMedicalShock(e.target.checked)}
                            />
                            의료비 충격 시나리오 활성화
                        </label>
                    </div>

                    {input.medical_shocks?.enabled && (
                        <>
                            {input.medical_shocks.occurrences.map((shock, i) => (
                                <div key={i} className="flex-row mb-2" style={{ gap: 8 }}>
                                    <input
                                        type="number"
                                        className="input"
                                        value={shock.age}
                                        onChange={e => updateMedicalShock(i, 'age', Number(e.target.value))}
                                        placeholder="연령"
                                        style={{ width: 70 }}
                                    />
                                    <span className="text-sub">세에</span>
                                    <input
                                        type="number"
                                        className="input"
                                        value={shock.amount}
                                        onChange={e => updateMedicalShock(i, 'amount', Number(e.target.value))}
                                        placeholder="금액"
                                        style={{ width: 120 }}
                                    />
                                    <span className="text-sub">원</span>
                                    <input
                                        type="text"
                                        className="input"
                                        value={shock.description || ''}
                                        onChange={e => updateMedicalShock(i, 'description', e.target.value)}
                                        placeholder="설명"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        onClick={() => removeMedicalShock(i)}
                                        className="btn btn-sm"
                                        style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button onClick={addMedicalShock} className="btn btn-secondary btn-sm mt-2">
                                + 의료비 충격 추가
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
