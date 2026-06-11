/**
 * What-If Slider Component
 * Real-time parameter adjustment with live success rate feedback
 */
import React, { useState, useEffect, useRef } from 'react';
import { type SimulationInput, type WhatIfParameter } from '../logic/types';
import { legacyInputToPlan } from '../logic/plan';
import { requestSimulation } from '../logic/simulationClient';
import {
    createPreviewSimulationOptions,
    createSimulationFingerprint
} from '../logic/simulationRequestPolicy';
import {
    getProgressClass,
    getSuccessRateToneClass,
    isAbortError,
    WHAT_IF_SLIDERS,
} from './what-if/sliderConfig';

interface Props {
    input: SimulationInput;
    onInputChange: (input: SimulationInput) => void;
}

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
            WHAT_IF_SLIDERS.forEach((slider) => {
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
                const result = await requestSimulation(legacyInputToPlan(testInput), previewOptions);

                if (seq === latestPreviewSeq.current) {
                    setSuccessRate(result.summary.successRate);
                }
            } catch (error) {
                if (lastPreviewFingerprintRef.current === fingerprint) {
                    lastPreviewFingerprintRef.current = null;
                }
                if (isAbortError(error)) {
                    return;
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
        WHAT_IF_SLIDERS.forEach((slider) => {
            newInput = slider.setValue(newInput, tempValues[slider.id]);
        });
        onInputChange(newInput);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-1 border-b border-transparent">가정 변경 분석</h3>
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
                {WHAT_IF_SLIDERS.map((slider) => {
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

