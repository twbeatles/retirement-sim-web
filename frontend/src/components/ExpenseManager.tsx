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

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ input, onChange }) => {
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
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>🎉</span> 목돈 지출 이벤트
                </h3>
                <button className="btn btn-sm btn-secondary" onClick={additem}>
                    + 추가
                </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
                결혼, 차량 교체, 여행 등 예상되는 큰 지출을 입력하세요.
            </p>

            <div className="space-y-3">
                {items.map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 border rounded-lg relative group">
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            onClick={() => remove(item.id)}
                        >
                            ✕
                        </button>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <input
                                className="input font-bold"
                                value={item.name}
                                onChange={e => handleChange(item.id, 'name', e.target.value)}
                                placeholder="이벤트명 (예: 가족 여행)"
                            />
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    className="input text-right text-red-600 font-bold"
                                    value={item.amount / 10000}
                                    onChange={e => handleChange(item.id, 'amount', Number(e.target.value) * 10000)}
                                    step={100}
                                />
                                <span className="text-sm font-bold text-gray-600">만원</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">나이:</span>
                                <input
                                    type="number"
                                    className="input w-16 text-center py-1"
                                    value={item.startAge}
                                    onChange={e => handleChange(item.id, 'startAge', Number(e.target.value))}
                                />
                                <span className="text-gray-600">세</span>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={item.isRecurring}
                                    onChange={e => handleChange(item.id, 'isRecurring', e.target.checked)}
                                />
                                <span className="text-gray-600">반복</span>
                            </label>

                            {item.isRecurring && (
                                <div className="flex items-center gap-2 animate-fadeIn">
                                    <input
                                        type="number"
                                        className="input w-16 text-center py-1"
                                        value={item.intervalYears || 5}
                                        onChange={e => handleChange(item.id, 'intervalYears', Number(e.target.value))}
                                    />
                                    <span className="text-gray-600">년 마다</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                    <p className="text-gray-400 text-sm">등록된 이벤트가 없습니다.</p>
                </div>
            )}
        </div>
    );
};
