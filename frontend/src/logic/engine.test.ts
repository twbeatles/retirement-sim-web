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

const createKernelParityInput = (): SimulationInput => ({
    current_age: 45,
    retire_age: 60,
    end_age: 90,
    annual_inflation: 0.02,
    portfolio: {
        assetClasses: [
            { id: 'stock', name: 'Stock', allocation: 0.7, expectedAnnualReturn: 0.07, annualVolatility: 0.18 },
            { id: 'bond', name: 'Bond', allocation: 0.3, expectedAnnualReturn: 0.03, annualVolatility: 0.06 }
        ],
        manualCorrelation: 0.2
    },
    general: {
        current_balance: 400000000,
        monthly_contribution: 1500000
    },
    private_pension: {
        current_balance: 60000000,
        monthly_contribution: 300000,
        annual_return: 0.035,
        payout_years: 25,
        annuity_annual_rate: 0.03
    },
    national_pension: {
        expected_monthly_benefit_at_retirement: 1800000,
        inflation_linked: true
    },
    debt: {
        current_balance: 120000000,
        annual_interest: 0.04,
        monthly_payment: 900000
    },
    withdrawal: {
        strategy: 'target_spending',
        targetMonthlySpending: 4500000,
        taxRate: 0.12,
        taxStrategy: 'simple'
    },
    events: [
        { month_index: 24, amount: -10000000, name: 'car' },
        { month_index: 144, amount: 30000000, name: 'inheritance' }
    ],
    simulation_settings: {
        mode: 'montecarlo',
        mc_paths: 64,
        seed: 20260222
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

        // Check month 12 (Age 61) which is index 11
        const row12 = timeline[11];
        expect(row12.age).toBeCloseTo(60.916, 2);

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
        // Month 12: 0 (index 11)
        const row12 = timeline[11];
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
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0.0;
        input.withdrawal.taxRate = 0.10; // 10% tax
        input.withdrawal.taxStrategy = 'simple';

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        // Withdraw 1000. Tax 100. Net 900.
        // Balance reduces by 1000.

        const row1 = timeline[0]; // First month of simulation

        expect(row1.cashflow.withdrawalGross).toBe(1000);
        expect(row1.cashflow.taxPaid).toBe(100);
        expect(row1.cashflow.withdrawalNet).toBe(900);

        // Balance starts at 10000.
        // After m=0 loop: 10000 - 1000 = 9000.
        expect(row1.general).toBe(9000);
    });

    it('includes reverse annuity income after start age', () => {
        const input = createBaseInput();
        input.current_age = 60;
        input.retire_age = 60;
        input.end_age = 62;
        input.general.current_balance = 0;
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0.0;
        input.withdrawal.fixedMonthlyAmount = 0;
        input.reverse_annuity = {
            enabled: true,
            houseValue: 500000000,
            startAge: 61,
            monthlyPayment: 500
        };

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        const beforeStart = timeline[11];
        const atStart = timeline[12];

        expect(beforeStart.cashflow.totalIncomeNet).toBe(0);
        expect(atStart.cashflow.totalIncomeNet).toBe(500);
    });

    it('pays severance annuity only during payout window', () => {
        const input = createBaseInput();
        input.current_age = 60;
        input.retire_age = 60;
        input.end_age = 62;
        input.general.current_balance = 0;
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0.0;
        input.withdrawal.fixedMonthlyAmount = 0;
        input.severance = {
            enabled: true,
            estimatedAmount: 1200,
            payoutType: 'annuity',
            annuityYears: 1
        };

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        expect(timeline[0].cashflow.totalIncomeNet).toBe(100);
        expect(timeline[11].cashflow.totalIncomeNet).toBe(100);
        expect(timeline[12].cashflow.totalIncomeNet).toBe(0);
    });

    it('uses historical inflation path regardless of annual_inflation input in historical mode', () => {
        const inputA = createBaseInput();
        inputA.current_age = 60;
        inputA.retire_age = 60;
        inputA.end_age = 62;
        inputA.general.current_balance = 100000;
        inputA.withdrawal.fixedMonthlyAmount = 0;
        inputA.portfolio.assetClasses = [
            { id: 'cash', name: 'cash', allocation: 1.0, expectedAnnualReturn: 0.0, annualVolatility: 0.0 }
        ];
        inputA.simulation_settings = {
            mode: 'historical',
            mc_paths: 20,
            historical_start_year: 2024
        };
        inputA.annual_inflation = 0.0;

        const inputB = structuredClone(inputA);
        inputB.annual_inflation = 0.2;

        const resultA = runSimulation(inputA);
        const resultB = runSimulation(inputB);

        expect(resultA.summary.finalTotalAssetsReal).toBeCloseTo(resultB.summary.finalTotalAssetsReal, 8);
    });

    it('marks historical runs with summary.source = historical', () => {
        const input = createBaseInput();
        input.current_age = 60;
        input.retire_age = 60;
        input.end_age = 62;
        input.simulation_settings = {
            mode: 'historical',
            mc_paths: 20,
            historical_start_year: 2000
        };

        const result = runSimulation(input);
        expect(result.mode).toBe('montecarlo');
        expect(result.summary.source).toBe('historical');
    });

    it('prioritizes historical_asset_mapping by asset id', () => {
        const base = createBaseInput();
        base.current_age = 60;
        base.retire_age = 60;
        base.end_age = 63;
        base.general.current_balance = 1000000;
        base.portfolio.assetClasses = [
            { id: 'asset_bond_like', name: '채권', allocation: 1, expectedAnnualReturn: 0.03, annualVolatility: 0 }
        ];
        base.simulation_settings = {
            mode: 'historical',
            mc_paths: 20,
            historical_start_year: 1995
        };

        const mapped = structuredClone(base);
        mapped.simulation_settings = {
            ...mapped.simulation_settings,
            historical_asset_mapping: {
                asset_bond_like: 'us_stock'
            }
        };

        const defaultResult = runSimulation(base);
        const mappedResult = runSimulation(mapped);
        expect(defaultResult.summary.finalTotalAssetsReal).not.toBeCloseTo(mappedResult.summary.finalTotalAssetsReal, 2);
    });

    it('changes outcomes between annual and threshold rebalancing modes', () => {
        const annual = createBaseInput();
        annual.current_age = 60;
        annual.retire_age = 60;
        annual.end_age = 62;
        annual.general.current_balance = 1000000;
        annual.withdrawal.fixedMonthlyAmount = 0;
        annual.simulation_settings = { mode: 'deterministic', mc_paths: 1 };
        annual.portfolio.assetClasses = [
            { id: 'stock', name: 'Stock', allocation: 0.5, expectedAnnualReturn: 0.3, annualVolatility: 0 },
            { id: 'bond', name: 'Bond', allocation: 0.5, expectedAnnualReturn: -0.05, annualVolatility: 0 }
        ];
        annual.rebalancing = {
            enabled: true,
            frequency: 'annual',
            thresholdPercent: 0.05,
            taxEfficient: false,
            tradingCostPercent: 0.01
        };

        const threshold = structuredClone(annual);
        threshold.rebalancing = {
            ...threshold.rebalancing!,
            frequency: 'threshold',
            thresholdPercent: 0.01
        };

        const annualResult = runSimulation(annual);
        const thresholdResult = runSimulation(threshold);
        expect(thresholdResult.summary.finalTotalAssetsReal).not.toBeCloseTo(annualResult.summary.finalTotalAssetsReal, 6);
    });

    it('changes outcomes between taxEfficient on/off in rebalancing', () => {
        const standard = createBaseInput();
        standard.current_age = 40;
        standard.retire_age = 45;
        standard.end_age = 46;
        standard.general.current_balance = 1000000;
        standard.general.monthly_contribution = 100000;
        standard.withdrawal.fixedMonthlyAmount = 0;
        standard.simulation_settings = { mode: 'deterministic', mc_paths: 1 };
        standard.portfolio.assetClasses = [
            { id: 'stock', name: 'Stock', allocation: 0.7, expectedAnnualReturn: 0.18, annualVolatility: 0 },
            { id: 'bond', name: 'Bond', allocation: 0.3, expectedAnnualReturn: -0.02, annualVolatility: 0 }
        ];
        standard.rebalancing = {
            enabled: true,
            frequency: 'monthly',
            thresholdPercent: 0.05,
            taxEfficient: false,
            tradingCostPercent: 0.01
        };

        const taxEfficient = structuredClone(standard);
        taxEfficient.rebalancing = {
            ...taxEfficient.rebalancing!,
            taxEfficient: true
        };

        const standardResult = runSimulation(standard);
        const taxEfficientResult = runSimulation(taxEfficient);
        expect(taxEfficientResult.summary.finalTotalAssetsReal).not.toBeCloseTo(standardResult.summary.finalTotalAssetsReal, 6);
    });

    it('limits VPW withdrawal YoY changes when vpwMaxYoYChange is set', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 65;
        input.end_age = 67; // 2 years
        input.general.current_balance = 100000;
        input.portfolio.assetClasses[0].expectedAnnualReturn = -0.50; // -50% return to force a huge drop in balance
        input.withdrawal.strategy = 'vpw';
        input.withdrawal.vpwMaxYoYChange = 0.10; // Max 10% drop per year (equivalent to ~0.79% per month smoothed)

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        // Month 0 withdrawal
        const w0 = timeline[0].cashflow.withdrawalGross;
        // Month 1 withdrawal
        const w1 = timeline[1].cashflow.withdrawalGross;

        // Since balance dropped by -50% annually, applied rate would plummet the withdrawal.
        // But the smoothing limits it to ~0.79% per month.
        const maxChangePerMonth = Math.pow(1 + 0.10, 1 / 12) - 1;
        const expectedW1Min = w0 * (1 - maxChangePerMonth);

        expect(w1).toBeGreaterThanOrEqual(expectedW1Min * 0.999);
    });

    it('aggregates events that occur in the same month', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 66;
        input.end_age = 67;
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0;
        input.general.current_balance = 1000;
        input.events = [
            { month_index: 0, amount: 200, name: 'a' },
            { month_index: 0, amount: -50, name: 'b' }
        ];

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];
        expect(timeline[0].general).toBeCloseTo(1150, 6);
    });

    it('throws when end age is not greater than current age', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 66;
        input.end_age = 65;

        expect(() => runSimulation(input)).toThrow();
    });

    it('keeps detailed health insurance premium at zero when dependent is true', () => {
        const nonDependentInput = createBaseInput();
        nonDependentInput.current_age = 65;
        nonDependentInput.retire_age = 65;
        nonDependentInput.end_age = 66;
        nonDependentInput.general.current_balance = 1000000;
        nonDependentInput.portfolio.assetClasses[0].expectedAnnualReturn = 0;
        nonDependentInput.withdrawal.strategy = 'fixed_amount';
        nonDependentInput.withdrawal.fixedMonthlyAmount = 0;
        nonDependentInput.health_insurance = {
            enabled: true,
            mode: 'detailed',
            monthlyPremium: 0,
            inflationLinked: false,
            propertyValue: 0,
            carValue: 0,
            isDependent: false
        };

        const dependentInput = structuredClone(nonDependentInput);
        if (!dependentInput.health_insurance) {
            throw new Error('health_insurance should exist for this test');
        }
        dependentInput.health_insurance.isDependent = true;

        const nonDependentResult = runSimulation(nonDependentInput);
        const dependentResult = runSimulation(dependentInput);

        const nonDependentTimeline = 'timeline' in nonDependentResult ? nonDependentResult.timeline : [];
        const dependentTimeline = 'timeline' in dependentResult ? dependentResult.timeline : [];
        const month0Gap = dependentTimeline[0].general - nonDependentTimeline[0].general;

        expect(month0Gap).toBeGreaterThan(10000);
    });

    it('accumulates medical shocks that occur in the same month', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 65;
        input.end_age = 66;
        input.general.current_balance = 1000;
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0;
        input.withdrawal.strategy = 'fixed_amount';
        input.withdrawal.fixedMonthlyAmount = 0;
        input.medical_shocks = {
            enabled: true,
            occurrences: [
                { age: 65, amount: 100, description: 'shock-1' },
                { age: 65, amount: 200, description: 'shock-2' }
            ]
        };

        const result = runSimulation(input);
        const timeline = 'timeline' in result ? result.timeline : [];

        expect(timeline[0].general).toBeCloseTo(700, 6);
    });

    it('clamps non-positive montecarlo path count to 1', () => {
        const input = createBaseInput();
        input.simulation_settings = {
            mode: 'montecarlo',
            mc_paths: -10
        };

        const result = runSimulation(input);
        expect(result.mode).toBe('montecarlo');
        if (result.mode !== 'montecarlo') return;
        expect(result.pathCount).toBe(1);
    });

    it('includes path-level depletion summary for montecarlo results', () => {
        const input = createBaseInput();
        input.current_age = 65;
        input.retire_age = 65;
        input.end_age = 70;
        input.general.current_balance = 5000;
        input.portfolio.assetClasses[0].expectedAnnualReturn = 0;
        input.withdrawal.strategy = 'fixed_amount';
        input.withdrawal.fixedMonthlyAmount = 400;
        input.simulation_settings = {
            mode: 'montecarlo',
            mc_paths: 5,
            seed: 42
        };

        const result = runSimulation(input);
        expect(result.mode).toBe('montecarlo');
        if (result.mode !== 'montecarlo') return;
        expect(result.summary.depletion).toBeTruthy();
        expect(result.summary.depletion?.firstDepletionMonthByPath).toHaveLength(5);
    });

    it('keeps seed-fixed montecarlo summary and sample timelines stable', () => {
        const input = createKernelParityInput();
        const result = runSimulation(input, {
            detailLevel: 'full',
            includeSampleTimelines: true,
            includeTrajectoryStats: true,
            includeSurvivalSeries: true,
            maxSampleTimelines: 3
        });

        expect(result.mode).toBe('montecarlo');
        if (result.mode !== 'montecarlo') return;

        expect(result.pathCount).toBe(64);
        expect(result.sampleTimelines).toHaveLength(3);
        expect(result.sampleTimelines.map((timeline) => timeline.length)).toEqual([540, 540, 540]);

        expect(result.summary.finalTotalAssets).toBeCloseTo(4796906554.014606, 6);
        expect(result.summary.finalTotalAssetsReal).toBeCloseTo(1967675730.395671, 6);
        expect(result.summary.successRate).toBeCloseTo(1, 8);

        expect(result.summary.mc?.totalAssets.p10).toBeCloseTo(466516058.5331348, 6);
        expect(result.summary.mc?.totalAssets.p50).toBeCloseTo(2802316493.1167784, 6);
        expect(result.summary.mc?.totalAssets.p90).toBeCloseTo(11042208541.582485, 6);
        expect(result.summary.mc?.totalAssetsReal.p10).toBeCloseTo(191363395.52982277, 6);
        expect(result.summary.mc?.totalAssetsReal.p50).toBeCloseTo(1149501265.0973158, 6);
        expect(result.summary.mc?.totalAssetsReal.p90).toBeCloseTo(4529478636.404866, 6);

        expect(result.trajectoryStats?.month).toHaveLength(540);
        expect(result.survivalSeries?.month).toHaveLength(540);

        const last = result.sampleTimelines[0][539];
        expect(last.month).toBe(539);
        expect(last.age).toBeCloseTo(89.91666666666666, 8);
        expect(last.totalAssets).toBeCloseTo(2053615134.526869, 6);
        expect(last.totalAssetsReal).toBeCloseTo(842386361.7689017, 6);
        expect(last.cashflow.nationalPension).toBeCloseTo(3255074.8306594263, 6);
    });
});
