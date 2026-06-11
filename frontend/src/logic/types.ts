import type { SimulationPlanV2 } from "./planV2";
import type {
    BucketSettings,
    BusinessIncome,
    GuardrailsSettings,
    HealthInsurance,
    HistoricalAssetType,
    InflationScenario,
    LaborIncomeSettings,
    LongevityRisk,
    MedicalShock,
    PensionConfig,
    RealEstateAsset,
    RebalancingSettings,
    ReverseAnnuity,
    SeveranceSettings,
    TaxCredit,
} from "./featureTypes";
export type {
    BacktestResult,
    BucketSettings,
    BusinessIncome,
    DepletionAnalysis,
    FavoriteAsset,
    GuardrailsSettings,
    HealthInsurance,
    HistoricalAssetType,
    InflationScenario,
    LaborIncomeEvent,
    LaborIncomeSettings,
    LongevityRisk,
    MedicalShock,
    OnboardingState,
    PensionConfig,
    PensionType,
    RealEstateAsset,
    RebalancingEvent,
    RebalancingSettings,
    ReverseAnnuity,
    ScenarioComparisonResult,
    SensitivityResult,
    SeveranceSettings,
    SoRRAnalysis,
    TaxCredit,
    ValidationWarning,
    WhatIfParameter,
} from "./featureTypes";

export type AssetClass = {
    id: string;
    name: string;
    expectedAnnualReturn: number;
    annualVolatility: number;
    allocation: number; // 0.0 to 1.0 (Percentage)
};

export type PortfolioModel = {
    assetClasses: AssetClass[];
    manualCorrelation?: number; // -1 to 1. Used to dampen weighted volatility with a single rho approximation.
};

export type LumpSumEvent = {
    month_index: number;
    amount: number; // (+) Income, (-) Expense
    name?: string; // Optional description
};

export type ExpenseDefinition = {
    id: string;
    name: string;
    amount: number; // Positive value in KRW
    startAge: number;
    isRecurring: boolean;
    intervalYears?: number;
    endAge?: number;
};

export type WithdrawalStrategy =
    | "fixed_amount"        // Existing: fixed monthly amount
    | "target_spending"     // Existing: gap filler
    | "fixed_percentage"    // Withdraw X% of portfolio annually (monthly adjusted)
    | "safe_withdrawal_rate" // 4% Rule (Const inflation adjusted)
    | "vpw"                 // Variable Percentage Withdrawal
    | "guardrails"          // Dynamic adjustment based on portfolio performance
    | "bucket";             // Bucket strategy (short/mid/long term)

export type WithdrawalPolicy = {
    strategy: WithdrawalStrategy;

    // Params
    fixedMonthlyAmount?: number;
    targetMonthlySpending?: number;
    percentageRate?: number; // For fixed_percentage
    initialSafeRate?: number; // For safe_withdrawal_rate (e.g., 0.04)

    taxRate: number; // 0.0 to 1.0 (Simple tax wrapping)

    // Tax Advanced
    taxStrategy?: "simple" | "detailed"; // detailed uses progressive tax brackets (KR)

    // VPW Specific
    vpwMaxWithdrawalRate?: number; // Optional cap, e.g. 0.1 (10%)
    vpwMinWithdrawalRate?: number; // Optional floor
    vpwMaxYoYChange?: number;      // Smoothing: Max Year-over-Year change (e.g. 0.1 for 10%)
};

export type HousingStatus =
    | "own_outright"
    | "rent"
    | "jeonse"
    | "mortgage";

export type SimulationRuleSet = {
    jurisdiction: "KR";
    version: string;
    taxYear: number;
    healthInsuranceYear: number;
    pensionYear: number;
    historicalDataVersion: string;
    historicalDataStartYear: number;
    historicalDataEndYear: number;
};

export type SimulationInput = {
    current_age: number;
    retire_age: number;
    end_age: number;
    annual_inflation: number;
    plan_v2?: SimulationPlanV2;
    rule_set?: SimulationRuleSet;
    housing_status?: HousingStatus;

    // New: Portfolio based approach
    portfolio: PortfolioModel;

    // Legacy support or Simplified View inputs (can be derived or used directly)
    general: {
        current_balance: number;
        monthly_contribution: number;
    };

    private_pension: {
        current_balance: number;
        monthly_contribution: number;
        annual_return: number;
        payout_years: number;
        annuity_annual_rate: number;
    };

    national_pension: {
        expected_monthly_benefit_at_retirement: number; // Basis amount (at age 65 usually)
        inflation_linked: boolean;
        startAge?: number; // Age to start receiving (e.g. 60 to 70). Default 65.
    };

    debt: {
        current_balance: number;
        annual_interest: number;
        monthly_payment: number;
    };

    events: LumpSumEvent[];
    expense_definitions?: ExpenseDefinition[];
    withdrawal: WithdrawalPolicy;

    simulation_settings: {
        mode: "deterministic" | "montecarlo" | "historical";
        mc_paths: number;
        seed?: number;
        // Historical backtesting settings
        historical_start_year?: number; // 1985-2024
        historical_asset_mapping?: Record<string, HistoricalAssetType>;
    };

    // Auto-rebalancing settings
    rebalancing?: RebalancingSettings;

    // Advanced Risk Analysis
    stress_test?: {
        enabled: boolean;
        startFromRetirement: boolean; // if true, starts at retirement month. else starts at month 0
        durationMonths: number;
        annualDeclineRate: number; // Positive number, e.g. 0.20 means -20% annual return
    };

    // ============================================
    // NEW FEATURES (Phase 1-5)
    // ============================================

    // Phase 1: Core Extensions
    inflation_scenario?: InflationScenario;
    health_insurance?: HealthInsurance;
    tax_credit?: TaxCredit;
    severance?: SeveranceSettings;
    reverse_annuity?: ReverseAnnuity;

    // Phase 2: Advanced Withdrawal
    guardrails?: GuardrailsSettings;
    bucket?: BucketSettings;

    // Phase 3: Risk Analysis
    medical_shocks?: MedicalShock;
    longevity_risk?: LongevityRisk;

    // Phase 6: Labor Income & Career Growth
    labor_income?: LaborIncomeSettings;

    // --- Phase 1: Extended Assets ---
    realEstate?: RealEstateAsset[];
    additionalPensions?: PensionConfig[];
    businessIncome?: BusinessIncome[];
};

export type TimelineRow = {
    month: number;
    age: number;
    isRetired: boolean;
    general: number;       // General Investment Balance
    privatePension: number;// Private Pension Balance
    debt: number;          // Debt Balance

    // Phase 1: Extended Asset Tracking
    realEstate: number;         // Real Estate Total Value
    additionalPension: number;  // Additional Pensions Total Balance

    totalAssets: number;   // Nominal
    totalAssetsReal: number; // Real (inflation adjusted)
    inflationFactor?: number;

    cashflow: {
        nationalPension: number;
        privatePension: number;
        additionalPension: number; // NEW from Phase 1 Additional Pensions
        withdrawalGross: number; // Before Tax
        withdrawalNet: number;   // After Tax
        taxPaid: number;
        healthInsurancePremium?: number;
        taxCreditApplied?: number;
        assessableIncomeForHealthInsurance?: number;
        totalIncomeNet: number;  // Sum of all net inflows
        sources?: TimelineCashflowSources;
    };
};

export type TimelineCashflowSources = {
    salary: number;
    businessIncome: number;
    rentalIncome: number;
    nationalPension: number;
    privatePension: number;
    additionalPension: number;
    severance: number;
    reverseMortgage: number;
    interestDividend: number;
    realizedCapitalGain: number;
    withdrawalPrincipal: number;
    oneOffIncome: number;
    oneOffExpense: number;
    medicalShock: number;
    housingCost: number;
    debtService: number;
    tradingCost: number;
};

export type LedgerTimelineRow = {
    month: number;
    age: number;
    isRetired: boolean;
    incomes: {
        salary: number;
        nationalPension: number;
        privatePension: number;
        additionalPension: number;
        businessIncome: number;
        rentalIncome: number;
        severance: number;
        reverseMortgage: number;
        oneOffIncome: number;
        withdrawalGross: number;
        totalGross: number;
        totalNet: number;
    };
    expenses: {
        essential: number;
        discretionary: number;
        housing: number;
        medicalBaseline: number;
        medicalShock: number;
        stageAdjustments: number;
        oneOffExpense: number;
        taxPaid: number;
        healthInsurancePremium: number;
        total: number;
    };
    tax: {
        taxableIncomeMonthly: number;
        healthInsuranceAssessableIncomeMonthly: number;
        taxPaid: number;
        taxCreditApplied: number;
    };
    balances: {
        taxableInvestments: number;
        privatePension: number;
        realEstate: number;
        additionalPensions: number;
        debt: number;
        totalAssets: number;
        totalAssetsReal: number;
    };
};

export type SimulationDetailLevel = "full" | "preview";

export type SimulationRunOptions = {
    detailLevel?: SimulationDetailLevel;
    // Upper bound for preview Monte Carlo paths
    previewPathCap?: number;
    // Skip timeline payload for lightweight preview responses
    includeSampleTimelines?: boolean;
    // Skip percentile trajectory payload when not needed by the current UI.
    includeTrajectoryStats?: boolean;
    // Skip survival series payload when not needed by the current UI.
    includeSurvivalSeries?: boolean;
    // Control number of retained sample timelines for chart/table rendering.
    maxSampleTimelines?: number;
};

export type SurvivalSeries = {
    month: number[];
    age: number[];
    survivalRate: number[]; // 0..100
};

export type DistributionStats = {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
};

export type RuleMetadata = {
    jurisdiction: "KR";
    version: string;
    taxYear: number;
    healthInsuranceYear: number;
    pensionYear: number;
    historicalDataVersion: string;
    historicalDataRange: {
        startYear: number;
        endYear: number;
    };
};

export type AssumptionWarning = {
    code: string;
    severity: "info" | "warning";
    message: string;
};

export type SimulationDepletionSummary = {
    firstDepletionMonthByPath: number[]; // -1 means never depleted
    firstDepletionAgeByPath: number[];   // -1 means never depleted
    neverDepletedRate: number;
    medianDepletionAge: number | null;
};

export type SimulationSurvivalSummary = {
    finalSurvivalRate: number;
    lowestSurvivalRate: number;
    firstBelowHundredPercentAge: number | null;
};

export type SimulationDisplayPath = {
    label: string;
    pathIndex: number | null;
    timeline: TimelineRow[];
    ledgerTimeline?: LedgerTimelineRow[];
};

export type SimulationDisplay = {
    representative?: SimulationDisplayPath;
    samples: SimulationDisplayPath[];
};

export type SimulationResult =
    | {
        mode: "deterministic";
        detailLevel: SimulationDetailLevel;
        timeline: TimelineRow[];
        ledgerTimeline?: LedgerTimelineRow[];
        display: SimulationDisplay;
        summary: SimulationSummary;
    }
    | {
        mode: "montecarlo" | "historical";
        detailLevel: SimulationDetailLevel;
        pathCount: number;
        sampleTimelines: TimelineRow[][]; // Subset of paths for visualization (e.g. first 5)
        ledgerTimeline?: LedgerTimelineRow[];
        display: SimulationDisplay;
        summary: SimulationSummary; // Statistical summary
        trajectoryStats?: SimulationTrajectoryStats; // Fan Chart Data
        survivalSeries?: SurvivalSeries; // Pre-computed series for survival chart
    };

export type SimulationSummary = {
    retireAge: number;
    endAge: number;
    source: "deterministic" | "montecarlo" | "historical";
    calculationMode: "deterministic" | "distribution";
    ruleMetadata: RuleMetadata;
    assumptionWarnings: AssumptionWarning[];

    // Deterministic or Mean stats
    finalTotalAssets: number;
    finalTotalAssetsReal: number;
    retirementPoint: {
        age: number;
        totalAssets: number;
        totalAssetsReal: number;
    };
    terminalStats: {
        totalAssets: DistributionStats;
        totalAssetsReal: DistributionStats;
    };

    // Success Rate (Assets > 0 at end_age)
    successRate: number;

    depletion?: SimulationDepletionSummary;
    depletionStats: SimulationDepletionSummary;
    survivalStats: SimulationSurvivalSummary;

    // Monte Carlo Stats (if applicable)
    mc?: {
        totalAssetsReal: DistributionStats;
        totalAssets: DistributionStats;
    };
};

export type SimulationTrajectoryStats = {
    month: number[];
    p10: number[];   // 10th percentile of Total Assets (Real)
    p25: number[];
    p50: number[];   // Median
    p75: number[];
    p90: number[];   // 90th percentile
};
