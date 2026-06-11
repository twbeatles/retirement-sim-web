import type { SimulationSummary } from "./types";

// --- Phase 1: Core Simulation Extensions ---

export type InflationScenario = {
    type: 'normal' | 'high' | 'low' | 'custom' | 'spike';
    baseRate: number;
    spikeStartAge?: number;
    spikeDurationYears?: number;
    spikeRate?: number;
};

export type HealthInsurance = {
    enabled: boolean;
    mode: 'simple' | 'detailed';
    monthlyPremium: number;
    inflationLinked: boolean;
    propertyValue?: number;
    carValue?: number;
    isDependent?: boolean;
};

export type TaxCredit = {
    enabled: boolean;
    mode: "manual" | "law_2026";
    lawYear: 2026;
    incomeBasis: "simulated_taxable_income";
    pensionSavingsContribution: number;
    irpContribution: number;
    creditRate?: number;
};

export type SeveranceSettings = {
    enabled: boolean;
    estimatedAmount: number;
    payoutType: 'lump_sum' | 'annuity';
    annuityYears?: number;
};

export type ReverseAnnuity = {
    enabled: boolean;
    houseValue: number;
    startAge: number;
    monthlyPayment: number;
};

export type GuardrailsSettings = {
    baseRate: number;
    upperThreshold: number;
    lowerThreshold: number;
    adjustmentRate: number;
};

export type BucketSettings = {
    shortTermYears: number;
    midTermYears: number;
    shortTermReturn: number;
    midTermReturn: number;
    rebalanceFrequency: 'annual' | 'semi-annual';
};

export type MedicalShock = {
    enabled: boolean;
    occurrences: Array<{
        age: number;
        amount: number;
        description?: string;
    }>;
};

export type LongevityRisk = {
    useDistribution: boolean;
    averageLifeExpectancy: number;
    stdDevYears: number;
};

export type SensitivityResult = {
    parameter: string;
    baseValue: number;
    testValues: number[];
    successRates: number[];
};

export type DepletionAnalysis = {
    depletionAges: number[];
    histogram: Array<{
        ageRange: string;
        count: number;
        percentage: number;
    }>;
    medianDepletionAge: number | null;
    neverDepletedRate: number;
};

export type SoRRAnalysis = {
    earlyRetirementImpact: number;
    lateRetirementImpact: number;
    scenarios: Array<{
        name: string;
        successRate: number;
        finalAssetsMean: number;
    }>;
};

export type ScenarioComparisonResult = {
    scenarios: Array<{
        id: string;
        name: string;
        summary: SimulationSummary;
        trajectoryP50: number[];
    }>;
};

export type WhatIfParameter =
    | 'retire_age'
    | 'annual_return'
    | 'withdrawal_rate'
    | 'monthly_contribution'
    | 'initial_balance';

export type ValidationWarning = {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
};

export type FavoriteAsset = {
    id: string;
    name: string;
    expectedAnnualReturn: number;
    annualVolatility: number;
    category: 'stock' | 'bond' | 'reit' | 'commodity' | 'cash' | 'other';
};

export type OnboardingState = {
    hasSeenIntro: boolean;
    currentStep: number;
    completedSteps: number[];
};

export type HistoricalAssetType =
    | 'us_stock'
    | 'global_stock'
    | 'us_bond'
    | 'korea_stock'
    | 'cash'
    | 'reit';

export type RebalancingSettings = {
    enabled: boolean;
    frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'threshold';
    thresholdPercent?: number;
    taxEfficient?: boolean;
    tradingCostPercent?: number;
};

export type BacktestResult = {
    scenarios: Array<{
        startYear: number;
        endYear: number;
        successRate: number;
        finalAssetsReal: number;
        worstYear: number;
        worstReturn: number;
    }>;
    overallSuccessRate: number;
    averageFinalAssets: number;
};

export type RebalancingEvent = {
    month: number;
    beforeAllocations: Record<string, number>;
    afterAllocations: Record<string, number>;
    tradingCost: number;
};

export type LaborIncomeEvent = {
    id: string;
    age: number;
    netMonthlyIncome: number;
    savingsRate: number;
    description?: string;
};

export type LaborIncomeSettings = {
    enabled: boolean;
    currentNetMonthlyIncome: number;
    currentSavingsRate: number;
    events: LaborIncomeEvent[];
};

export type RealEstateAsset = {
    id: string;
    name: string;
    currentValue: number;
    growthRate: number;
    rentalYield: number;
    managementCost: number;
    type: 'residential' | 'investment';
};

export type PensionType = 'national' | 'personal' | 'dc' | 'db';

export type PensionConfig = {
    id: string;
    name: string;
    type: PensionType;
    currentValue: number;
    monthlyContribution: number;
    expectedReturn?: number;
    startDate?: string;
    salaryGrowth?: number;
    dbMultiplier?: number;
    startAge: number;
    payoutType: 'lifetime' | 'fixed_period';
    payoutYears?: number;
    monthlyPayout?: number;
};

export type BusinessIncome = {
    id: string;
    name: string;
    monthlyIncome: number;
    growthRate: number;
    startAge: number;
    endAge: number;
};
