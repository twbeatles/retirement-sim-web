import React, { useState, useEffect } from 'react';
import { SimulationInput } from '../logic/types';
import { useSimulation } from '../hooks/useSimulation';

type GoalPlannerProps = {
    input: SimulationInput;
    onApply: (newInput: SimulationInput) => void;
};

export const GoalPlanner: React.FC<GoalPlannerProps> = ({ input, onApply }) => {
    const { solveContribution, solveRetireAge, isCalculating } = useSimulation();
    const [targetRate, setTargetRate] = useState(0.9); // 90%
    const [mode, setMode] = useState<'contribution' | 'retire_age'>('contribution');
    const [result, setResult] = useState<number | null>(null);

    // Listen for solver results from the worker
    useEffect(() => {
        const handleResult = (e: CustomEvent<any>) => {
            setResult(e.detail);
        };

        window.addEventListener('SOLVER_RESULT', handleResult as EventListener);
        return () => window.removeEventListener('SOLVER_RESULT', handleResult as EventListener);
    }, []);

    const handleCalculate = () => {
        setResult(null);

        if (mode === 'contribution') {
            solveContribution(input, targetRate);
        } else {
            solveRetireAge(input, targetRate);
        }
    };

    const handleApply = () => {
        if (result === null) return;
        const newInput = { ...input };

        if (mode === 'contribution') {
            newInput.general.monthly_contribution = result;
        } else {
            newInput.retire_age = result;
        }

        onApply(newInput);
    };

    return (
        <div className="card animate-fadeIn">
            <h3 className="card-header">🎯 목표 달성 플래너 (역산 계산기)</h3>
            <p className="text-sm text-sub mb-4">
                원하는 성공 확률을 달성하기 위해 필요한 저축액이나 은퇴 시기를 계산해드립니다.
            </p>

            <div className="grid-2-cols mb-4">
                <div className="input-group">
                    <label className="label">목표 성공 확률</label>
                    <div className="flex-row gap-2">
                        {[0.8, 0.9, 0.95, 1.0].map(r => (
                            <button
                                key={r}
                                className={`btn-sm ${targetRate === r ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setTargetRate(r)}
                            >
                                {r * 100}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="input-group">
                    <label className="label">계산할 항목</label>
                    <select
                        className="input"
                        value={mode}
                        onChange={(e) => {
                            setMode(e.target.value as any);
                            setResult(null);
                        }}
                    >
                        <option value="contribution">필요 월 저축액 계산</option>
                        <option value="retire_age">적정 은퇴 나이 계산</option>
                    </select>
                </div>
            </div>

            <div className="planner-action-area">
                <button
                    className="btn btn-primary w-full"
                    onClick={handleCalculate}
                    disabled={isCalculating}
                >
                    {isCalculating ? '🧮 계산 중...' : '🚀 솔루션 찾기'}
                </button>
            </div>

            {result !== null && (
                <div className="result-box mt-4 animate-scaleIn">
                    <div className="text-center">
                        <div className="text-sm text-sub">목표 달성을 위한 제안</div>
                        <div className="text-2xl font-bold my-2 text-primary">
                            {mode === 'contribution'
                                ? `${Math.round(result / 10000).toLocaleString()}만원 / 월`
                                : `${result}세 은퇴`
                            }
                        </div>
                        <div className="text-xs text-sub mb-3">
                            (현재값: {mode === 'contribution'
                                ? `${Math.round(input.general.monthly_contribution / 10000).toLocaleString()}만원`
                                : `${input.retire_age}세`
                            })
                        </div>

                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleApply}
                        >
                            ✨ 시뮬레이션에 적용하기
                        </button>
                    </div>
                </div>
            )}

            {result === null && !isCalculating && mode === 'contribution' && (
                <div className="mt-4 p-3 bg-github-subtle rounded text-xs text-sub">
                    💡 0 ~ 5,000만원 범위 내에서 탐색합니다. 불가능한 목표일 경우 결과가 나오지 않을 수 있습니다.
                </div>
            )}

            <style>{`
                .btn-sm {
                    padding: 4px 8px;
                    font-size: 0.8rem;
                    border-radius: var(--radius);
                }
                .btn-outline {
                    border: 1px solid var(--border);
                    background: transparent;
                    color: var(--text-sub);
                }
                .btn-primary {
                    background: var(--primary);
                    color: white;
                    border: 1px solid var(--primary);
                }
                .result-box {
                    background: var(--bg-hover);
                    padding: var(--space-md);
                    border-radius: var(--radius);
                    border: 2px solid var(--primary-light);
                }
            `}</style>
        </div>
    );
};
