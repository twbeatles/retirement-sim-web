import { describe, it, expect } from 'vitest';
import { runSimulation } from './engine';
import { SimulationInput } from './types';

// Minimal Helper for creating input
const createBaseInput = (): SimulationInput => ({
    current_age: 60,
    retire_age: 65,
    end_age: 70, // 10 year sim
    annual_inflation: 0.0,
    portfolio: {
        assetClasses: [
            { id: 'stock', name: 'Stock', allocation: 1.0, expectedAnnualReturn: 0.10, annualVolatility: 0.0 }
        ],
        manualCorrelation: 1.0
    },
    general: {
        current_balance: 10000,
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
    withdrawal: {
        strategy: 'fixed_amount',
        fixedMonthlyAmount: 0,
        taxRate: 0,
        taxStrategy: 'simple'
    },
    events: [],
    simulation_settings: {
        mode: 'deterministic',
        mc_paths: 1
    }
});

describe('Simulation Engine', () => {
    it('calculates compound interest correctly (Deterministic)', () => {
        const input = createBaseInput();
        input.current_age = 60;
        input.retire_age = 61; // 1 year of accumulation
        input.end_age = 62;
        // 10% annual return, 0 contribution.
        // 10000 start.
        // After 1 year (12 months): 10000 * (1.10)

        // Note: The engine uses monthly compounding: (1+r_m)^12
        // monthlyRateFromAnnual(0.10) ensures that (1+r_m)^12 = 1.10

        const result = runSimulation(input);

        const timeline = 'timeline' in result ? result.timeline : null;
        expect(timeline).not.toBeNull();
        if (!timeline) return;

        // Check month 12 (Age 61)
        const row12 = timeline[12];
        expect(row12.age).toBeCloseTo(61);

        // Theoretical Value: 10000 * 1.10 = 11000
        // Floating point tolerance
        expect(row12.general).toBeCloseTo(11000, 2);
    });

    it('handles monthly contributions', () => {
        const input = createBaseInput();
        input.current_age = 30;
        input.retire_age = 31; // 1 year
        input.end_age = 32;
        input.general.current_balance = 0;
        input.general.monthly_contribution = 100;
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0.0; // 0% return for simple math

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        // After 12 months, should have 12 * 100 = 1200
        const row12 = timeline[12];
        expect(row12.general).toBeCloseTo(1200, 2);
    });

    it('withdrawal subtracts from balance', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 65; // Already retired
        input.end_age = 66; // 1 year
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0.0;
        input.general.current_balance = 1200;
        input.withdrawal.strategy = 'fixed_amount';
        input.withdrawal.fixedMonthlyAmount = 100;

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        // Month 1: 1200 - 100 = 1100
        // Month 12: 0
        const row12 = timeline[12];
        expect(row12.general).toBeCloseTo(0, 2);
    });

    it('correctly reduces taxes in simple mode', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 65;
        input.end_age = 66;
        input.general.current_balance = 10000;
        input.withdrawal.strategy = 'fixed_amount';
        input.withdrawal.fixedMonthlyAmount = 1000;
        input.withdrawal.taxRate = 0.10; // 10% tax
        input.withdrawal.taxStrategy = 'simple';

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        // Withdraw 1000. Tax 100. Net 900.
        // Balance reduces by 1000.

        const row1 = timeline[1]; // Month 0 is initial state? No, Engine loop:
        // m=0 (Age 65.0). isRetired=true (if >= monthsToRetire). 
        // m=0 is the first month of simulation.

        expect(row1.cashflow.withdrawalGross).toBe(1000);
        expect(row1.cashflow.taxPaid).toBe(100);
        expect(row1.cashflow.withdrawalNet).toBe(900);

        // Balance starts at 10000.
        // After m=0 loop: 10000 - 1000 = 9000.
        expect(row1.general).toBe(9000);
    });
});
