import React, { useState, useEffect } from 'react';
import { SimulationInput, LumpSumEvent } from '../logic/types';

interface ExpenseManagerProps {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

// Internal type for managing UI state before flattening to LumpSumEvent[]
interface ExpenseItem {
    id: string;
    name: string;
    amount: number; // Positive input (expense), converted to negative for engine
    startAge: number;
    isRecurring: boolean;
    intervalYears?: number;
    endAge?: number;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = React.memo(({ input, onChange }) => {
    // We don't store ExpenseItem[] in the main input to keep types.ts clean.
    // Instead, we parse existing input.events to reconstruct (if possible) or just manage new ones.
    // For simplicity in this version, we will maintain a local state that synchronizes ONE-WAY to input.events.
    // However, to support editing, we ideally need to store the "definitions" in input.
    // SINCE the user accepted 'types.ts' changes might be complex, we will stick to:
    // "UI manages a list of events. On change, it completely replaces input.events with the generated list."

    // Warn: If there are events from other sources (e.g. Severance), we must preserve them.
    // We'll trust that 'severance' has its own dedicated logic in engine and doesn't pollute 'events' array permanently 
    // OR we filter them out. 
    // Current engine logic: Severance ADDS to eventsMap at runtime, or adds to input.events?
    // Looking at engine.ts: "input.severance? ... eventsMap.set(...)". It does NOT modify input.events.
    // So input.events is safe to own by this component for "User defined events".

    const [items, setItems] = useState<ExpenseItem[]>([]);

    // Load initial items from input.events? 
    // Since input.events is just {month, amount}, it's hard to reverse-engineer "Recurring Car Payment".
    // For this MVP, we will start empty or strict mapping. 
    // BETTER UX: Let's assume input.events ONLY contains what this manager produced + maybe simple manual ones.
    // We will effectively RESET input.events when this component mounts/updates if we want full control.
    // BUT that destroys data. 
    // STRATEGY: We will just write to input.events. Re-reading is hard. 
    // We will use a local state for the "Rich" definitions and re-generate input.events on every change.

    const additem = () => {
        const newItem: ExpenseItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: '새 지출',
            amount: 10000000,
            startAge: input.current_age + 1,
            isRecurring: false
        };
        updateItems([...items, newItem]);
    };

    const updateItems = (newItems: ExpenseItem[]) => {
        setItems(newItems);

        // Generate LumpSumEvents
        const newLumpSums: LumpSumEvent[] = [];

        newItems.forEach(item => {
            if (item.amount <= 0) return;

            const expenseAmount = -item.amount; // Expenses are negative

            if (item.isRecurring && item.intervalYears && item.intervalYears > 0) {
                // Recurring
                let currentAge = item.startAge;
                const endLimit = item.endAge || input.end_age;

                while (currentAge <= endLimit) {
                    const monthIdx = Math.round((currentAge - input.current_age) * 12);
                    if (monthIdx >= 0) {
                        newLumpSums.push({
                            month_index: monthIdx,
                            amount: expenseAmount,
                            name: `${item.name} (${currentAge}세)`
                        });
                    }
                    currentAge += item.intervalYears;
                }
            } else {
                // One-time
                const monthIdx = Math.round((item.startAge - input.current_age) * 12);
                if (monthIdx >= 0) {
                    newLumpSums.push({
                        month_index: monthIdx,
                        amount: expenseAmount,
                        name: item.name
                    });
                }
            }
        });

        // Update parent
        onChange({
            ...input,
            events: newLumpSums
        });
    };

    const handleChange = (id: string, field: keyof ExpenseItem, value: any) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        updateItems(newItems);
    };

    const remove = (id: string) => {
        updateItems(items.filter(i => i.id !== id));
    };

    // Calculate total explicitly for display
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                    <span className="text-xl leading-none">🎉</span> 목돈 지출 이벤트
                </h3>
                <button
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors text-xs shadow-sm cursor-pointer whitespace-nowrap"
                    onClick={additem}
                >
                    + 추가
                </button>
            </div>

            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">
                결혼, 차량 교체, 여행 등 예상되는 큰 지출을 입력하세요.
            </p>

            <div className="flex flex-col gap-3">
                {items.map(item => (
                    <div key={item.id} className="p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl relative group transition-all hover:border-slate-300 dark:hover:border-zinc-600">
                        <button
                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                            onClick={() => remove(item.id)}
                            title="삭제"
                        >
                            ✕
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pr-8">
                            <input
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={item.name}
                                onChange={e => handleChange(item.id, 'name', e.target.value)}
                                placeholder="이벤트명 (예: 가족 여행)"
                            />
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    className="w-full pl-3 pr-10 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={item.amount / 10000}
                                    onChange={e => handleChange(item.id, 'amount', Number(e.target.value) * 10000)}
                                    step={100}
                                />
                                <span className="absolute right-3 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none select-none">만원</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden px-2 py-1">
                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs select-none">나이:</span>
                                <input
                                    type="number"
                                    className="w-12 text-center bg-transparent border-none font-bold text-slate-900 dark:text-white focus:outline-none p-0"
                                    value={item.startAge}
                                    onChange={e => handleChange(item.id, 'startAge', Number(e.target.value))}
                                />
                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs select-none">세</span>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer group/cb">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600 cursor-pointer"
                                    checked={item.isRecurring}
                                    onChange={e => handleChange(item.id, 'isRecurring', e.target.checked)}
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover/cb:text-slate-900 dark:group-hover/cb:text-white transition-colors">반복</span>
                            </label>

                            {item.isRecurring && (
                                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden px-2 py-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <input
                                        type="number"
                                        className="w-10 text-center bg-transparent border-none font-bold text-slate-900 dark:text-white focus:outline-none p-0"
                                        value={item.intervalYears || 5}
                                        onChange={e => handleChange(item.id, 'intervalYears', Number(e.target.value))}
                                    />
                                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs select-none">년 마다</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <span className="text-2xl mb-2 opacity-50">💸</span>
                    <p className="font-medium text-slate-400 dark:text-slate-500 text-sm m-0">등록된 이벤트가 없습니다.</p>
                </div>
            )}
        </div>
    );
});
