import type {
    BucketSettings,
    BusinessIncome,
    GuardrailsSettings,
    HealthInsurance,
    HistoricalAssetType,
    HousingStatus,
    InflationScenario,
    LaborIncomeSettings,
    LongevityRisk,
    MedicalShock,
    PensionConfig,
    PortfolioModel,
    RebalancingSettings,
    ReverseAnnuity,
    SeveranceSettings,
    SimulationInput,
    SimulationRuleSet,
    TaxCredit,
    WithdrawalPolicy
} from "../types";

export type PlanAccountType =
    | "cash"
    | "taxable_investment"
    | "pension_savings"
    | "irp"
    | "dc"
    | "db"
    | "annuity"
    | "residence"
    | "investment_real_estate"
    | "debt";

export type PlanIncomeStreamType =
    | "salary"
    | "national_pension"
    | "private_annuity"
    | "db_pension"
    | "rental_income"
    | "business_income"
    | "severance"
    | "reverse_mortgage";

export type PlanAccount = {
    id: string;
    type: PlanAccountType;
    name: string;
    currency: "KRW";
    balance: number;
    monthlyContribution?: number;
    annualReturn?: number;
    annualVolatility?: number;
    debtTerms?: {
        annualInterest: number;
        monthlyPayment: number;
    };
    payout?: {
        startAge?: number;
        payoutType?: "lifetime" | "fixed_period";
        payoutYears?: number;
        monthlyPayout?: number;
        annuityAnnualRate?: number;
        inflationLinked?: boolean;
    };
    realEstate?: {
        growthRate: number;
        rentalYield: number;
        managementCost: number;
        usage: "primary_residence" | "investment";
    };
    portfolioAllocation?: Array<{
        assetClassId: string;
        name: string;
        allocation: number;
        expectedAnnualReturn: number;
        annualVolatility: number;
        historicalMapping?: HistoricalAssetType;
    }>;
    metadata?: Record<string, unknown>;
};

export type PlanIncomeStream = {
    id: string;
    type: PlanIncomeStreamType;
    name: string;
    monthlyAmount: number;
    startAge: number;
    endAge?: number;
    annualGrowthRate?: number;
    inflationLinked?: boolean;
    taxable: boolean;
    healthInsuranceIncluded: boolean;
    sourceAccountId?: string;
    metadata?: Record<string, unknown>;
};

export type PlanExpenseEvent = {
    id: string;
    name: string;
    monthIndex: number;
    amount: number;
};

export type PlanStageAdjustment = {
    id: string;
    name: string;
    amount: number;
    startAge: number;
    endAge?: number;
    isRecurring: boolean;
    intervalYears?: number;
};

export type SimulationPlanV2 = {
    planVersion: "v2";
    profile: {
        country: "KR";
        householdType: "single";
        currentAge: number;
        retirementAge: number;
        endAge: number;
        housingStatus: HousingStatus;
        longevityRisk: LongevityRisk;
    };
    accounts: PlanAccount[];
    incomeStreams: PlanIncomeStream[];
    expensePlan: {
        essentialMonthly: number;
        discretionaryMonthly: number;
        housingMonthly: number;
        medicalBaselineMonthly: number;
        oneOffEvents: PlanExpenseEvent[];
        stageAdjustments: PlanStageAdjustment[];
        medicalShocks: MedicalShock;
    };
    withdrawalPolicy: {
        retirementSpendingTarget: number;
        strategy: WithdrawalPolicy;
        guardrails: GuardrailsSettings;
        bucket: BucketSettings;
        taxCredit: TaxCredit;
        healthInsurance: HealthInsurance;
        rebalancing: RebalancingSettings;
        severance: SeveranceSettings;
        reverseAnnuity: ReverseAnnuity;
    };
    ruleSet: SimulationRuleSet;
    simulationSettings: {
        mode: SimulationInput["simulation_settings"]["mode"];
        monteCarloPaths: number;
        seed?: number;
        annualInflation: number;
        historicalStartYear?: number;
        historicalAssetMapping?: Record<string, HistoricalAssetType>;
        portfolio: PortfolioModel;
        inflationScenario: InflationScenario;
        stressTest: NonNullable<SimulationInput["stress_test"]>;
        laborIncome: LaborIncomeSettings;
        additionalPensions: PensionConfig[];
        businessIncome: BusinessIncome[];
    };
};
