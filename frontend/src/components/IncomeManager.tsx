import React from 'react';
import type { SimulationInput, LaborIncomeEvent } from '../logic/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import {
    buildLaborChartData,
    generateIncomeEventId,
    parseIncomeNumber,
    resolveLaborIncome,
} from './income-manager/helpers';

interface IncomeManagerProps {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

export const IncomeManager = React.memo(function IncomeManager({ input, onChange }: IncomeManagerProps) {
    const labor = React.useMemo(
        () => resolveLaborIncome(input),
        [input]
    );

    const handleEnableToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...input,
            labor_income: {
                ...labor,
                enabled: e.target.checked
            }
        });
    };

    const handleBaseChange = (field: keyof typeof labor, value: number) => {
        const newLabor = { ...labor, [field]: value };
        onChange({
            ...input,
            labor_income: newLabor,
            general: {
                ...input.general,
                monthly_contribution: newLabor.currentNetMonthlyIncome * newLabor.currentSavingsRate
            }
        });
    };

    const addEvent = () => {
        const newEvent: LaborIncomeEvent = {
            id: generateIncomeEventId(),
            age: input.current_age + 5,
            netMonthlyIncome: labor.currentNetMonthlyIncome * 1.2,
            savingsRate: labor.currentSavingsRate,
            description: '승진/이직'
        };
        const newLabor = {
            ...labor,
            events: [...labor.events, newEvent]
        };
        onChange({ ...input, labor_income: newLabor });
    };

    const updateEvent = (id: string, updates: Partial<LaborIncomeEvent>) => {
        const newEvents = labor.events.map(e => e.id === id ? { ...e, ...updates } : e);
        onChange({ ...input, labor_income: { ...labor, events: newEvents } });
    };

    const removeEvent = (id: string) => {
        const newEvents = labor.events.filter(e => e.id !== id);
        onChange({ ...input, labor_income: { ...labor, events: newEvents } });
    };

    // Visualization Data
    const chartData = React.useMemo(
        () => buildLaborChartData(labor, input.current_age, input.retire_age),
        [labor, input.current_age, input.retire_age]
    );

    const currentMonthlySavings = Math.round((labor.currentNetMonthlyIncome * labor.currentSavingsRate) / 10000);

    if (!labor.enabled) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all opacity-70 hover:opacity-100 dark:opacity-60 dark:hover:opacity-100 group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">💸</span>
                        <span className="text-base font-bold text-slate-900 dark:text-white">소득 및 저축 관리</span>
                    </div>
                    <button
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors text-xs shadow-sm cursor-pointer whitespace-nowrap"
                        onClick={() => onChange({ ...input, labor_income: { ...labor, enabled: true } })}
                    >
                        상세 모드 켜기
                    </button>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 m-0">
                    소득 성장과 저축률 변화를 계획하려면 상세 모드를 켜세요.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">💸</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">소득 성장 & 저축 계획</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-slate-700 dark:text-slate-300">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600 cursor-pointer"
                        checked={labor.enabled}
                        onChange={handleEnableToggle}
                    />
                    사용 중
                </label>
            </div>

            {/* Current Income Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">현재 실수령 월급</label>
                    <div className="relative flex items-center">
                        <input
                            className="w-full pl-3 pr-10 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            type="number"
                            value={Math.round(labor.currentNetMonthlyIncome / 10000)}
                            onChange={e => handleBaseChange('currentNetMonthlyIncome', parseIncomeNumber(e.target.value) * 10000)}
                        />
                        <span className="absolute right-3 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none select-none">만원</span>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">현재 저축률</label>
                    <div className="relative flex items-center">
                        <input
                            className="w-full pl-3 pr-8 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            type="number"
                            step="5"
                            value={Math.round(labor.currentSavingsRate * 100)}
                            onChange={e => handleBaseChange('currentSavingsRate', parseIncomeNumber(e.target.value) / 100)}
                        />
                        <span className="absolute right-3 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none select-none">%</span>
                    </div>
                </div>
            </div>

            {/* Monthly Savings Display */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl mb-6">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">월 저축액</span>
                <span className="text-xl font-extrabold text-blue-800 dark:text-blue-300">{currentMonthlySavings.toLocaleString()}만원</span>
            </div>

            {/* Future Events */}
            <div className="mb-8">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <span className="text-base leading-none">📅</span> 미래 소득 변화 이벤트
                </h4>

                <div className="flex flex-col gap-3 mb-3">
                    {labor.events.map((evt) => (
                        <div key={evt.id} className="p-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl relative group transition-colors hover:border-slate-300 dark:hover:border-zinc-600">
                            <div className="flex justify-between items-center mb-2.5">
                                <input
                                    className="bg-transparent border-none font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-0 placeholder:text-slate-400 text-sm px-1 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-900 focus:shadow-sm"
                                    value={evt.description}
                                    placeholder="이벤트명"
                                    onChange={e => updateEvent(evt.id, { description: e.target.value })}
                                />
                                <button
                                    className="w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer text-xs"
                                    onClick={() => removeEvent(evt.id)}
                                    title="삭제"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 relative pr-2">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">나이</label>
                                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 min-w-[3.5rem]">
                                        <input
                                            type="number"
                                            className="w-8 bg-transparent border-none text-right font-bold text-slate-900 dark:text-white focus:outline-none p-0 text-sm"
                                            value={evt.age}
                                            onChange={e => updateEvent(evt.id, { age: parseIncomeNumber(e.target.value) })}
                                        />
                                        <span className="text-xs font-medium text-slate-500">세</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">월급</label>
                                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 min-w-[5rem]">
                                        <input
                                            type="number"
                                            className="w-10 bg-transparent border-none text-right font-bold text-slate-900 dark:text-white focus:outline-none p-0 text-sm"
                                            value={Math.round(evt.netMonthlyIncome / 10000)}
                                            onChange={e => updateEvent(evt.id, { netMonthlyIncome: parseIncomeNumber(e.target.value) * 10000 })}
                                        />
                                        <span className="text-xs font-medium text-slate-500">만원</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">저축률</label>
                                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 min-w-[4rem]">
                                        <input
                                            type="number"
                                            className="w-8 bg-transparent border-none text-right font-bold text-slate-900 dark:text-white focus:outline-none p-0 text-sm"
                                            value={Math.round(evt.savingsRate * 100)}
                                            onChange={e => updateEvent(evt.id, { savingsRate: parseIncomeNumber(e.target.value) / 100 })}
                                        />
                                        <span className="text-xs font-medium text-slate-500">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className="w-full px-4 py-2 border border-dashed border-slate-300 dark:border-zinc-600 rounded-xl bg-slate-50/50 hover:bg-slate-100 dark:bg-zinc-800/30 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 font-semibold transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
                    onClick={addEvent}
                >
                    <span className="text-base leading-none">➕</span> 소득 변화 추가 (예: 5년 후 승진)
                </button>
            </div>

            {/* Chart */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">나이별 예상 월 저축액 추이</p>
                <div className="w-full bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-2 h-36 border border-slate-100 dark:border-zinc-700/50">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="age"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={false}
                                interval={4}
                            />
                            <YAxis hide />
                            <Tooltip
                                formatter={(val: number) => Math.round(val / 10000).toLocaleString() + '만원'}
                                labelFormatter={(age) => `${age}세`}
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    color: '#0f172a'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="savings"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#savingsGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});
