import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { solveForLaborSavingsRate, solveForMonthlyContribution } from "./solver";
import { SimulationInput } from "./types";

function createLaborInput(): SimulationInput {
    return {
        current_age: 35,
        retire_age: 45,
        end_age: 60,
        annual_inflation: 0.02,
        portfolio: {
            assetClasses: [
                { id: "stock", name: "Stock", allocation: 1, expectedAnnualReturn: 0.05, annualVolatility: 0.15 }
            ],
            manualCorrelation: 1
        },
        general: {
            current_balance: 20000000,
            monthly_contribution: 0
        },
        private_pension: {
            current_balance: 0,
            monthly_contribution: 0,
            annual_return: 0,
            payout_years: 0,
            annuity_annual_rate: 0
        },
        national_pension: {
            expected_monthly_benefit_at_retirement: 0,
            inflation_linked: false
        },
        debt: {
            current_balance: 0,
            annual_interest: 0,
            monthly_payment: 0
        },
        events: [],
        withdrawal: {
            strategy: "fixed_amount",
            fixedMonthlyAmount: 1800000,
            taxRate: 0,
            taxStrategy: "simple"
        },
        simulation_settings: {
            mode: "montecarlo",
            mc_paths: 120,
            seed: 20260225
        },
        labor_income: {
            enabled: true,
            currentNetMonthlyIncome: 3500000,
            currentSavingsRate: 0.25,
            events: [
                {
                    id: "promotion",
                    age: 40,
                    netMonthlyIncome: 4200000,
                    savingsRate: 0.30,
                    description: "promotion"
                }
            ]
        }
    };
}

describe("Labor-income solver", () => {
    it("solves savings rate in [0,1] and improves success rate directionally", () => {
        const input = createLaborInput();
        const baseline = runSimulation(input).summary.successRate;
        const solvedRate = solveForLaborSavingsRate(input, 0.8);

        expect(solvedRate).not.toBeNull();
        if (solvedRate === null) return;
        expect(solvedRate).toBeGreaterThanOrEqual(0);
        expect(solvedRate).toBeLessThanOrEqual(1);

        const applied = structuredClone(input);
        if (!applied.labor_income) return;
        const prevRate = applied.labor_income.currentSavingsRate;
        const scale = prevRate > 0 ? solvedRate / prevRate : 1;
        applied.labor_income.currentSavingsRate = solvedRate;
        applied.labor_income.events = applied.labor_income.events.map((event) => ({
            ...event,
            savingsRate: Math.max(0, Math.min(1, event.savingsRate * scale))
        }));
        applied.general.monthly_contribution = applied.labor_income.currentNetMonthlyIncome * solvedRate;
        const updated = runSimulation(applied).summary.successRate;

        expect(updated).toBeGreaterThanOrEqual(baseline);
    });

    it("monthly contribution solver delegates to labor solver when labor income is enabled", () => {
        const input = createLaborInput();
        const solvedRate = solveForLaborSavingsRate(input, 0.7);
        const solvedMonthly = solveForMonthlyContribution(input, 0.7);

        expect(solvedRate).not.toBeNull();
        expect(solvedMonthly).not.toBeNull();
        if (solvedRate === null || solvedMonthly === null || !input.labor_income) return;

        expect(solvedMonthly).toBeCloseTo(input.labor_income.currentNetMonthlyIncome * solvedRate, -3);
    });
});

