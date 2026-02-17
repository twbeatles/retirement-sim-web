import React, { useState } from 'react';
import { SimulationInput } from '../logic/types';
import { useSimulation } from '../hooks/useSimulation';

type GoalPlannerProps = {
    input: SimulationInput;
    onApply: (newInput: SimulationInput) => void;
};

export const GoalPlanner: React.FC<GoalPlannerProps> = ({ input, onApply }) => {
    const { solveContribution, solveRetireAge } = useSimulation();
    const [targetRate, setTargetRate] = useState(0.9);
    const [mode, setMode] = useState<'contribution' | 'retire_age'>('contribution');
    const [result, setResult] = useState<number | null>(null);
    const [isSolving, setIsSolving] = useState(false);

    const handleCalculate = async () => {
        setResult(null);
        setIsSolving(true);

        try {
            const solvedValue = mode === 'contribution'
                ? await solveContribution(input, targetRate)
                : await solveRetireAge(input, targetRate);
            setResult(solvedValue);
        } catch (error) {
            console.error('Goal planner solve error:', error);
        } finally {
            setIsSolving(false);
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
            <h3 className="card-header">Goal Planner</h3>
            <p className="text-sm text-sub mb-4">
                Find the required monthly contribution or retirement age for a target success rate.
            </p>

            <div className="grid-2-cols mb-4">
                <div className="input-group">
                    <label className="label">Target success rate</label>
                    <div className="flex-row gap-2">
                        {[0.8, 0.9, 0.95, 1.0].map((r) => (
                            <button
                                key={r}
                                className={`btn btn-sm ${targetRate === r ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setTargetRate(r)}
                            >
                                {r * 100}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="input-group">
                    <label className="label">Mode</label>
                    <select
                        className="input"
                        value={mode}
                        onChange={(e) => {
                            setMode(e.target.value as 'contribution' | 'retire_age');
                            setResult(null);
                        }}
                    >
                        <option value="contribution">Required monthly contribution</option>
                        <option value="retire_age">Earliest retirement age</option>
                    </select>
                </div>
            </div>

            <div className="planner-action-area">
                <button
                    className="btn btn-primary w-full"
                    onClick={handleCalculate}
                    disabled={isSolving}
                >
                    {isSolving ? 'Calculating...' : 'Find target'}
                </button>
            </div>

            {result !== null && (
                <div className="result-box mt-4 animate-scaleIn">
                    <div className="text-center">
                        <div className="text-sm text-sub">Suggested value</div>
                        <div className="text-2xl font-bold my-2 text-primary">
                            {mode === 'contribution'
                                ? `${Math.round(result / 10000).toLocaleString()}만원 / 월`
                                : `${result}세 은퇴`
                            }
                        </div>
                        <div className="text-xs text-sub mb-3">
                            (Current: {mode === 'contribution'
                                ? `${Math.round(input.general.monthly_contribution / 10000).toLocaleString()}만원`
                                : `${input.retire_age}세`
                            })
                        </div>

                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleApply}
                        >
                            Apply to simulation
                        </button>
                    </div>
                </div>
            )}

            {result === null && !isSolving && mode === 'contribution' && (
                <div className="mt-4 p-3 planner-note text-xs text-sub">
                    Search range: 0 ~ 5,000만원/month.
                </div>
            )}
        </div>
    );
};

