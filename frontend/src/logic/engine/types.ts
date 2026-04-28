import type { SimulationInput, TimelineCashflowSources, TimelineRow } from "../types";

export type LiquidAccountBucket = "general" | "privatePension";

export type IncomeTreatment = {
    taxable: boolean;
    healthInsuranceIncluded: boolean;
};

export interface SimulationContext {
    mu_m: number;
    sig_m: number;
    r_private: number;
    infl_m: number;
    eventsMap: Map<number, number>;
    monthsToRetire: number;
    totalMonths: number;
    initialDebt: number;
    debtMonthlyRate: number;
    inflationByMonth?: Float64Array;
    severanceMonth?: number;
    severanceMonthlyPayout?: number;
    reverseAnnuityStartMonth?: number;
    reverseAnnuityPayment?: number;
    medicalShockMonths?: Map<number, number>;
    contributionByMonth?: Float64Array;
    salaryIncomeByMonth?: Float64Array;
    bucketState?: {
        shortTerm: number;
        midTerm: number;
        longTerm: number;
        lastRebalanceMonth: number;
    };
    businessIncomeByMonth?: Float64Array;
    realEstateState?: {
        initialValues: number[];
        growthRates: number[];
        rentalYields: number[];
        managementCosts: number[];
    };
    pensionState?: {
        configs: any[];
        initialValues: number[];
        monthlyRates: number[];
    };
    annualPortfolioReturn?: number;
    annualInflation?: number;
    historicalReturns?: Float64Array;
    historicalAssetReturns?: Float64Array[];
    historicalInflation?: Float64Array;
    rebalanceMonths?: Set<number>;
    targetAllocations?: number[];
    tradingCostRate?: number;
    thresholdPercent?: number;
    rebalancingFrequency?: NonNullable<SimulationInput["rebalancing"]>["frequency"];
    taxEfficientRebalance?: boolean;
    assetExpectedMonthlyReturns?: number[];
    assetMonthlyVolatility?: number[];
    correlation?: number;
    liquidWithdrawalOrder?: LiquidAccountBucket[];
    incomeTreatmentBySource?: Partial<Record<keyof TimelineCashflowSources, IncomeTreatment>>;
}

export type PathSimulationOptions = {
    captureTimeline?: boolean;
    trajectorySink?: Float64Array | null;
    trajectoryPathIndex?: number;
    trajectoryLength?: number;
};

export type PathSimulationResult = {
    timeline: TimelineRow[];
    finalTotalAssets: number;
    finalTotalAssetsReal: number;
    retirementTotalAssets: number;
    retirementTotalAssetsReal: number;
    retirementAge: number;
    firstDepletionMonth: number;
    monthsSimulated: number;
};
