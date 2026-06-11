import type { LaborIncomeSettings, SimulationInput } from "../../logic/types";

export function parseIncomeNumber(value: string): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export function generateIncomeEventId(): string {
    return Math.random().toString(36).substr(2, 9);
}

export function resolveLaborIncome(input: SimulationInput): LaborIncomeSettings {
    return input.labor_income || {
        enabled: false,
        currentNetMonthlyIncome: 3000000,
        currentSavingsRate: 0.5,
        events: []
    };
}

export function buildLaborChartData(
    labor: LaborIncomeSettings,
    currentAge: number,
    retireAge: number
) {
    const data = [];
    const sortedEvents = [...labor.events].sort((a, b) => a.age - b.age);
    let currentIncome = labor.currentNetMonthlyIncome;
    let currentRate = labor.currentSavingsRate;
    let eventIdx = 0;

    for (let age = currentAge; age < retireAge; age++) {
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
}
