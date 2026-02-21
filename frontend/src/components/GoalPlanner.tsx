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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all animate-in fade-in duration-300">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 pb-3 border-b border-slate-100 dark:border-zinc-800 mt-0">🎯 Goal Planner</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">
                Find the required monthly contribution or retirement age for a target success rate.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target success rate</label>
                    <div className="flex flex-wrap gap-2">
                        {[0.8, 0.9, 0.95, 1.0].map((r) => (
                            <button
                                key={r}
                                className={`flex-1 min-w-[3.5rem] px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-200 ${targetRate === r
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-500'
                                    }`}
                                onClick={() => setTargetRate(r)}
                            >
                                {r * 100}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mode</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center]"
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

            <div className="mt-2">
                <button
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex justify-center items-center cursor-pointer"
                    onClick={handleCalculate}
                    disabled={isSolving}
                >
                    {isSolving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Calculating...
                        </>
                    ) : 'Find target'}
                </button>
            </div>

            {result !== null && (
                <div className="mt-5 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl animate-in zoom-in-95 duration-300">
                    <div className="text-center">
                        <div className="text-sm font-semibold text-blue-600/80 dark:text-blue-400/80">Suggested value</div>
                        <div className="text-3xl font-bold my-2 text-blue-700 dark:text-blue-400">
                            {mode === 'contribution'
                                ? `${Math.round(result / 10000).toLocaleString()}만원 / 월`
                                : `${result}세 은퇴`
                            }
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                            (Current: {mode === 'contribution'
                                ? `${Math.round(input.general.monthly_contribution / 10000).toLocaleString()}만원`
                                : `${input.retire_age}세`
                            })
                        </div>

                        <button
                            className="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold py-2 px-6 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm transition-colors text-sm cursor-pointer"
                            onClick={handleApply}
                        >
                            Apply to simulation
                        </button>
                    </div>
                </div>
            )}

            {result === null && !isSolving && mode === 'contribution' && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-500 flex items-center gap-2">
                    <span className="text-base leading-none">💡</span> Search range: 0 ~ 5,000만원/month.
                </div>
            )}
        </div>
    );
};

