import React from 'react';
import type { SimulationInput, LaborIncomeEvent } from '../logic/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface IncomeManagerProps {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

function num(v: string) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

export const IncomeManager = React.memo(function IncomeManager({ input, onChange }: IncomeManagerProps) {
    const labor = input.labor_income || {
        enabled: false,
        currentNetMonthlyIncome: 3000000,
        currentSavingsRate: 0.5,
        events: []
    };

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
            id: generateId(),
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
    const chartData = React.useMemo(() => {
        const data = [];
        const sortedEvents = [...labor.events].sort((a, b) => a.age - b.age);
        let currentIncome = labor.currentNetMonthlyIncome;
        let currentRate = labor.currentSavingsRate;
        let eventIdx = 0;

        for (let age = input.current_age; age < input.retire_age; age++) {
            while (eventIdx < sortedEvents.length && age >= sortedEvents[eventIdx].age) {
                currentIncome = sortedEvents[eventIdx].netMonthlyIncome;
                currentRate = sortedEvents[eventIdx].savingsRate;
                eventIdx++;
            }
            data.push({
                age: Math.floor(age),
                savings: currentIncome * currentRate,
                income: currentIncome
            });
        }
        return data;
    }, [labor, input.current_age, input.retire_age]);

    const currentMonthlySavings = Math.round((labor.currentNetMonthlyIncome * labor.currentSavingsRate) / 10000);

    if (!labor.enabled) {
        return (
            <div className="card income-manager-collapsed">
                <div className="income-header">
                    <div className="income-title">
                        <span className="income-icon">💸</span>
                        <span>소득 및 저축 관리</span>
                    </div>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onChange({ ...input, labor_income: { ...labor, enabled: true } })}
                    >
                        상세 모드 켜기
                    </button>
                </div>
                <p className="income-hint">
                    소득 성장과 저축률 변화를 계획하려면 상세 모드를 켜세요.
                </p>
            </div>
        );
    }

    return (
        <div className="card income-manager">
            <div className="income-header">
                <div className="income-title">
                    <span className="income-icon">💸</span>
                    <span>소득 성장 & 저축 계획</span>
                </div>
                <label className="checkbox-label text-sm">
                    <input type="checkbox" checked={labor.enabled} onChange={handleEnableToggle} />
                    사용 중
                </label>
            </div>

            {/* Current Income Settings */}
            <div className="income-current">
                <div className="income-field">
                    <label className="label">현재 실수령 월급</label>
                    <div className="input-with-unit">
                        <input
                            className="input"
                            type="number"
                            value={Math.round(labor.currentNetMonthlyIncome / 10000)}
                            onChange={e => handleBaseChange('currentNetMonthlyIncome', num(e.target.value) * 10000)}
                        />
                        <span className="input-unit">만원</span>
                    </div>
                </div>
                <div className="income-field">
                    <label className="label">현재 저축률</label>
                    <div className="input-with-unit">
                        <input
                            className="input"
                            type="number"
                            step="5"
                            value={Math.round(labor.currentSavingsRate * 100)}
                            onChange={e => handleBaseChange('currentSavingsRate', num(e.target.value) / 100)}
                        />
                        <span className="input-unit">%</span>
                    </div>
                </div>
            </div>

            {/* Monthly Savings Display */}
            <div className="savings-display">
                <span className="savings-label">월 저축액</span>
                <span className="savings-amount">{currentMonthlySavings.toLocaleString()}만원</span>
            </div>

            {/* Future Events */}
            <div className="income-events">
                <h4 className="events-title">📅 미래 소득 변화 이벤트</h4>

                {labor.events.map((evt) => (
                    <div key={evt.id} className="event-card">
                        <div className="event-header">
                            <input
                                className="event-name"
                                value={evt.description}
                                placeholder="이벤트명"
                                onChange={e => updateEvent(evt.id, { description: e.target.value })}
                            />
                            <button
                                className="btn-icon btn-danger"
                                onClick={() => removeEvent(evt.id)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="event-fields">
                            <div className="event-field">
                                <label>나이</label>
                                <div className="input-mini">
                                    <input
                                        type="number"
                                        value={evt.age}
                                        onChange={e => updateEvent(evt.id, { age: num(e.target.value) })}
                                    />
                                    <span>세</span>
                                </div>
                            </div>
                            <div className="event-field">
                                <label>월급</label>
                                <div className="input-mini">
                                    <input
                                        type="number"
                                        value={Math.round(evt.netMonthlyIncome / 10000)}
                                        onChange={e => updateEvent(evt.id, { netMonthlyIncome: num(e.target.value) * 10000 })}
                                    />
                                    <span>만원</span>
                                </div>
                            </div>
                            <div className="event-field">
                                <label>저축률</label>
                                <div className="input-mini">
                                    <input
                                        type="number"
                                        value={Math.round(evt.savingsRate * 100)}
                                        onChange={e => updateEvent(evt.id, { savingsRate: num(e.target.value) / 100 })}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button className="btn btn-secondary add-event-btn" onClick={addEvent}>
                    + 소득 변화 추가 (예: 5년 후 승진)
                </button>
            </div>

            {/* Chart */}
            <div className="income-chart">
                <p className="chart-title">나이별 예상 월 저축액 추이</p>
                <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="age"
                            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                            tickLine={false}
                            interval={4}
                        />
                        <YAxis hide />
                        <Tooltip
                            formatter={(val: number) => Math.round(val / 10000).toLocaleString() + '만원'}
                            labelFormatter={(age) => `${age}세`}
                            contentStyle={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                fontSize: '0.8rem'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="savings"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#savingsGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});
