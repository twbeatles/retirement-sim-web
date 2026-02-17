import { SimulationInput } from "./types";

export const INITIAL_INPUT: SimulationInput = {
    current_age: 35,
    retire_age: 60,
    end_age: 95,
    annual_inflation: 0.02,

    // General assets (returns are calculated from portfolio)
    general: { current_balance: 50000000, monthly_contribution: 1500000 },

    private_pension: {
        current_balance: 30000000,
        monthly_contribution: 340000, // IRP limit approx
        annual_return: 0.04,
        payout_years: 20,
        annuity_annual_rate: 0.03
    },

    national_pension: {
        expected_monthly_benefit_at_retirement: 1300000,
        inflation_linked: true,
        startAge: 65  // Default to standard pension start age
    },

    debt: {
        current_balance: 0,
        annual_interest: 0.045,
        monthly_payment: 0
    },

    portfolio: {
        assetClasses: [
            { id: "stock", name: "주식(미국/전세계)", expectedAnnualReturn: 0.09, annualVolatility: 0.18, allocation: 0.6 },
            { id: "bond", name: "채권(국채/종합)", expectedAnnualReturn: 0.04, annualVolatility: 0.06, allocation: 0.4 }
        ]
    },

    withdrawal: {
        strategy: "safe_withdrawal_rate",
        initialSafeRate: 0.04,
        taxRate: 0.154, // General tax rate assumption
        targetMonthlySpending: 3000000
    },

    events: [],

    simulation_settings: {
        mode: "montecarlo", // Default to MC for "wow" factor
        mc_paths: 200,
        seed: 42,
        historical_start_year: 1985
    },

    // Phase 7: Auto-Rebalancing
    rebalancing: {
        enabled: false,
        frequency: 'annual' as const,
        thresholdPercent: 0.05, // 5%
        taxEfficient: false,
        tradingCostPercent: 0.001 // 0.1%
    },

    stress_test: {
        enabled: false,
        startFromRetirement: true,
        durationMonths: 24, // 2 years
        annualDeclineRate: 0.20 // -20%
    },

    labor_income: {
        enabled: false,
        currentNetMonthlyIncome: 3000000,
        currentSavingsRate: 0.5,
        events: []
    },

    // Phase 1: New Features Initial State
    realEstate: [],
    additionalPensions: [],
    businessIncome: [],

    // Phase 2: Advanced Withdrawal Strategies
    guardrails: {
        baseRate: 0.04,
        upperThreshold: 0.05,
        lowerThreshold: 0.03,
        adjustmentRate: 0.10
    },
    bucket: {
        shortTermYears: 2,
        midTermYears: 5,
        shortTermReturn: 0.02,
        midTermReturn: 0.04,
        rebalanceFrequency: 'annual' as const
    },

    // Phase 1: Health & Retirement
    health_insurance: {
        enabled: false,
        mode: "simple",
        monthlyPremium: 200000,
        inflationLinked: true
    },
    severance: {
        enabled: false,
        estimatedAmount: 50000000,
        payoutType: 'lump_sum' as const,
        annuityYears: 10
    },

    // Phase 3: Risk Features
    longevity_risk: {
        useDistribution: false,
        averageLifeExpectancy: 85,
        stdDevYears: 5
    },
    medical_shocks: {
        enabled: false,
        occurrences: []
    },

    // Phase 1: Additional Features
    reverse_annuity: {
        enabled: false,
        houseValue: 0,
        startAge: 70,
        monthlyPayment: 0
    },
    inflation_scenario: {
        type: 'normal' as const,
        baseRate: 0.02
    }
};
