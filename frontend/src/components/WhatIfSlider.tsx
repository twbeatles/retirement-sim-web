/**
 * What-If Slider Component
 * Real-time parameter adjustment with live success rate feedback
 */
import React, { useState, useEffect, useRef } from 'react';
import { SimulationInput, WhatIfParameter } from '../logic/types';
import { requestSimulation } from '../logic/simulationClient';

interface Props {
    input: SimulationInput;
    onInputChange: (input: SimulationInput) => void;
}

interface SliderConfig {
    id: WhatIfParameter;
    label: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
    getValue: (input: SimulationInput) => number;
    setValue: (input: SimulationInput, value: number) => SimulationInput;
}

const SLIDERS: SliderConfig[] = [
    {
        id: 'retire_age',
        label: '은퇴 나이',
        min: 45,
        max: 70,
        step: 1,
        format: (v) => `${v}세`,
        getValue: (state) => state.retire_age,
        setValue: (state, value) => ({ ...state, retire_age: value })
    },
    {
        id: 'withdrawal_rate',
        label: '인출률(SWR)',
        min: 0.02,
        max: 0.08,
        step: 0.005,
        format: (v) => `${(v * 100).toFixed(1)}%`,
        getValue: (state) => state.withdrawal.initialSafeRate || 0.04,
        setValue: (state, value) => ({
            ...state,
            withdrawal: { ...state.withdrawal, initialSafeRate: value }
        })
    },
    {
        id: 'monthly_contribution',
        label: '월 저축액',
        min: 0,
        max: 5000000,
        step: 100000,
        format: (v) => `${(v / 10000).toFixed(0)}만원`,
        getValue: (state) => state.general.monthly_contribution,
        setValue: (state, value) => ({
            ...state,
            general: { ...state.general, monthly_contribution: value }
        })
    },
    {
        id: 'initial_balance',
        label: '초기 자산',
        min: 0,
        max: 500000000,
        step: 10000000,
        format: (v) => `${(v / 100000000).toFixed(1)}억원`,
        getValue: (state) => state.general.current_balance,
        setValue: (state, value) => ({
            ...state,
            general: { ...state.general, current_balance: value }
        })
    }
];

export function WhatIfSlider({ input, onInputChange }: Props) {
    const [tempValues, setTempValues] = useState<Record<WhatIfParameter, number>>({
        retire_age: input.retire_age,
        annual_return: 0,
        withdrawal_rate: input.withdrawal.initialSafeRate || 0.04,
        monthly_contribution: input.general.monthly_contribution,
        initial_balance: input.general.current_balance
    });
    const [successRate, setSuccessRate] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const latestPreviewSeq = useRef(0);

    useEffect(() => {
        setTempValues({
            retire_age: input.retire_age,
            annual_return: 0,
            withdrawal_rate: input.withdrawal.initialSafeRate || 0.04,
            monthly_contribution: input.general.monthly_contribution,
            initial_balance: input.general.current_balance
        });
    }, [input]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            const seq = ++latestPreviewSeq.current;
            setIsCalculating(true);

            let testInput = { ...input };
            SLIDERS.forEach((slider) => {
                testInput = slider.setValue(testInput, tempValues[slider.id]);
            });

            testInput = {
                ...testInput,
                simulation_settings: {
                    ...testInput.simulation_settings,
                    mc_paths: Math.min(testInput.simulation_settings.mc_paths, 80)
                }
            };

            try {
                const result = await requestSimulation(testInput, {
                    detailLevel: 'preview',
                    previewPathCap: 80,
                    includeSampleTimelines: false
                });

                if (seq === latestPreviewSeq.current) {
                    setSuccessRate(result.summary.successRate);
                }
            } catch (error) {
                console.error('What-if preview failed:', error);
            } finally {
                if (seq === latestPreviewSeq.current) {
                    setIsCalculating(false);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [tempValues, input]);

    const handleChange = (sliderId: WhatIfParameter, value: number) => {
        setTempValues((prev) => ({ ...prev, [sliderId]: value }));
    };

    const applyChanges = () => {
        let newInput = { ...input };
        SLIDERS.forEach((slider) => {
            newInput = slider.setValue(newInput, tempValues[slider.id]);
        });
        onInputChange(newInput);
    };

    const getSuccessRateColor = (rate: number | null) => {
        if (rate === null) return 'var(--text-sub)';
        if (rate >= 0.9) return 'var(--success)';
        if (rate >= 0.7) return '#4CAF50';
        if (rate >= 0.5) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="card">
            <h3 className="card-header">What-If 분석</h3>
            <p className="text-sub text-sm mb-4">
                파라미터를 조정하면 실시간으로 성공 확률 변화를 확인할 수 있습니다.
            </p>

            <div
                className="text-center mb-4"
                style={{
                    padding: '20px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)'
                }}
            >
                <div className="text-sm text-sub mb-2">예상 성공 확률</div>
                <div
                    style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: getSuccessRateColor(successRate),
                        transition: 'color 0.3s'
                    }}
                >
                    {isCalculating ? '...' : successRate !== null ? `${(successRate * 100).toFixed(1)}%` : '-'}
                </div>
                <div
                    style={{
                        width: '100%',
                        height: 8,
                        background: 'var(--border)',
                        borderRadius: 4,
                        marginTop: 12,
                        overflow: 'hidden'
                    }}
                >
                    <div
                        style={{
                            width: `${(successRate || 0) * 100}%`,
                            height: '100%',
                            background: getSuccessRateColor(successRate),
                            transition: 'width 0.3s, background 0.3s'
                        }}
                    />
                </div>
            </div>

            <div className="flex-col" style={{ gap: 16 }}>
                {SLIDERS.map((slider) => {
                    const value = tempValues[slider.id];
                    const originalValue = slider.getValue(input);
                    const hasChanged = value !== originalValue;

                    return (
                        <div key={slider.id}>
                            <div className="flex-between mb-1">
                                <label className="text-sm font-bold">{slider.label}</label>
                                <span
                                    className="text-sm"
                                    style={{
                                        color: hasChanged ? 'var(--primary)' : 'var(--text-main)'
                                    }}
                                >
                                    {slider.format(value)}
                                    {hasChanged && (
                                        <span className="text-sub text-xs ml-2">(원래: {slider.format(originalValue)})</span>
                                    )}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                value={value}
                                onChange={(e) => handleChange(slider.id, Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary)' }}
                            />
                            <div className="flex-between text-xs text-sub">
                                <span>{slider.format(slider.min)}</span>
                                <span>{slider.format(slider.max)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={applyChanges} className="btn btn-primary mt-4" style={{ width: '100%' }}>
                변경사항 적용
            </button>
        </div>
    );
}

