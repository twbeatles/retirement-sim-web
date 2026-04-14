/**
 * What-If Slider Component
 * Real-time parameter adjustment with live success rate feedback
 */
import React, { useState, useEffect, useRef } from 'react';
import { type SimulationInput, type WhatIfParameter } from '../logic/types';
import { requestSimulation } from '../logic/simulationClient';
import {
    createPreviewSimulationOptions,
    createSimulationFingerprint
} from '../logic/simulationRequestPolicy';

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

export const WhatIfSlider = React.memo(function WhatIfSlider({ input, onInputChange }: Props) {
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
    const lastPreviewFingerprintRef = useRef<string | null>(null);

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

            const previewOptions = createPreviewSimulationOptions(80);
            const fingerprint = createSimulationFingerprint(testInput, previewOptions);
            if (fingerprint === lastPreviewFingerprintRef.current) {
                return;
            }

            lastPreviewFingerprintRef.current = fingerprint;
            setIsCalculating(true);

            try {
                const result = await requestSimulation(testInput, previewOptions);

                if (seq === latestPreviewSeq.current) {
                    setSuccessRate(result.summary.successRate);
                }
            } catch (error) {
                if (lastPreviewFingerprintRef.current === fingerprint) {
                    lastPreviewFingerprintRef.current = null;
                }
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

    const getSuccessRateToneClass = (rate: number | null) => {
        if (rate === null) return 'text-sub';
        if (rate >= 0.9) return 'text-success';
        if (rate >= 0.7) return 'whatif-good';
        if (rate >= 0.5) return 'text-warning';
        return 'text-danger';
    };

    const getProgressClass = (rate: number | null) => {
        if (rate === null) return "bg-slate-200 dark:bg-zinc-700";
        if (rate >= 0.9) return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
        if (rate >= 0.7) return "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
        if (rate >= 0.5) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
        return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-1 border-b border-transparent">What-If 분석</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 mt-0">
                파라미터를 조정하면 실시간으로 성공 확률 변화를 확인할 수 있습니다.
            </p>

            <div className="text-center mb-6 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">예상 성공 확률</div>
                <div className={`text-4xl font-black tabular-nums tracking-tight mb-3 transition-colors ${getSuccessRateToneClass(successRate)}`}>
                    {isCalculating ? '...' : successRate !== null ? `${(successRate * 100).toFixed(1)}%` : '-'}
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`h-full transition-all duration-500 ease-out rounded-full ${getProgressClass(successRate)}`}
                        style={{ width: `${(successRate || 0) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {SLIDERS.map((slider) => {
                    const value = tempValues[slider.id];
                    const originalValue = slider.getValue(input);
                    const hasChanged = value !== originalValue;

                    return (
                        <div key={slider.id} className="group">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{slider.label}</label>
                                <span
                                    className={`text-sm font-semibold transition-colors ${hasChanged ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded' : 'text-slate-900 dark:text-white'}`}
                                >
                                    {slider.format(value)}
                                    {hasChanged && (
                                        <span className="text-slate-400 dark:text-slate-500 text-xs ml-2 font-medium">(원래: {slider.format(originalValue)})</span>
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
                                className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all my-2 outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                                <span>{slider.format(slider.min)}</span>
                                <span>{slider.format(slider.max)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={applyChanges} className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mt-8 disabled:opacity-50 disabled:cursor-not-allowed">
                변경사항 적용
            </button>
        </div>
    );
});

