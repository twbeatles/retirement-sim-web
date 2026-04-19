import type {
    BucketSettings,
    GuardrailsSettings,
    HealthInsurance,
    HistoricalAssetType,
    HousingStatus,
    InflationScenario,
    LaborIncomeSettings,
    LongevityRisk,
    MedicalShock,
    PortfolioModel,
    RebalancingSettings,
    ReverseAnnuity,
    SeveranceSettings,
    SimulationInput,
    SimulationRuleSet,
    TaxCredit,
    WithdrawalPolicy
} from "../types";
import type {
    PlanAccountType,
    PlanExpenseEvent,
    PlanIncomeStreamType,
    PlanStageAdjustment,
} from "../planV2";

export type PlanAccountTaxTreatment =
    | "taxable"
    | "tax_deferred"
    | "tax_exempt"
    | "non_taxable";

export type PlanAccountHealthInsuranceTreatment =
    | "assessable"
    | "excluded"
    | "property_only";

export type PlanExpenseBuckets = {
    essential: number;
    discretionary: number;
    housing: number;
    medical: number;
    dependentSupport: number;
};

export type PlanAccount = {
    id: string;
    type: PlanAccountType;
    name: string;
    currency: "KRW";
    balance: number;
    monthlyContribution?: number;
    annualReturn?: number;
    annualVolatility?: number;
    taxTreatment: PlanAccountTaxTreatment;
    healthInsuranceTreatment: PlanAccountHealthInsuranceTreatment;
    withdrawalPriority: number;
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

export type SimulationPlanV3 = {
    planVersion: "v3";
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
        monthlyBuckets: PlanExpenseBuckets;
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
    rulebook: SimulationRuleSet;
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
    };
};

export type SimulationPlanFileEnvelopeV3 = {
    schemaVersion: 3;
    exportedAt: number;
    plan: SimulationPlanV3;
};
