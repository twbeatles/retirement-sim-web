import type { SimulationPlanV2 } from "./planV2";

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

// --- Phase 6: Labor Income ---
export type LaborIncomeEvent = {
    id: string;              // Unique ID for UI handling
    age: number;             // Age when income changes
    netMonthlyIncome: number; // New Net Monthly Income (Real value)
    savingsRate: number;      // Savings Rate (0.0 - 1.0)
    description?: string;    // e.g. "Promotion", "Job Switch"
};

export type LaborIncomeSettings = {
    enabled: boolean;
    currentNetMonthlyIncome: number;
    currentSavingsRate: number; // 0.0 - 1.0
    events: LaborIncomeEvent[];
};

// --- Phase 1: New Assets & Pensions ---

export type RealEstateAsset = {
    id: string;
    name: string;
    currentValue: number;
    growthRate: number;       // Annual appreciation (e.g., 0.03)
    rentalYield: number;      // Annual rental income % (e.g., 0.04)
    managementCost: number;   // Annual cost % (e.g., 0.01)
    type: 'residential' | 'investment';
};

export type PensionType = 'national' | 'personal' | 'dc' | 'db';

export type PensionConfig = {
    id: string;
    name: string;
    type: PensionType;
    currentValue: number;     // Current balance or accumulated amount
    monthlyContribution: number;

    // DC Specific
    expectedReturn?: number;  // For DC/Personal

    // DB Specific
    startDate?: string;       // Employment start date (optional)
    salaryGrowth?: number;    // Annual salary growth for DB projection
    dbMultiplier?: number;    // e.g. 1/12

    // Payout
    startAge: number;
    payoutType: 'lifetime' | 'fixed_period';
    payoutYears?: number;     // If fixed_period
    monthlyPayout?: number;   // NEW: Direct monthly payout amount (for DB)
};

export type BusinessIncome = {
    id: string;
    name: string;
    monthlyIncome: number;
    growthRate: number;       // Annual growth of income
    startAge: number;
    endAge: number;
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

// ============================================
// NEW FEATURE TYPES (Phase 1-5)
// ============================================

// --- Phase 1: Core Simulation Extensions ---

// 인플레이션 시나리오
export type InflationScenario = {
    type: 'normal' | 'high' | 'low' | 'custom' | 'spike';
    baseRate: number;           // 기본 인플레이션율
    spikeStartAge?: number;     // 스파이크 시작 연령
    spikeDurationYears?: number; // 스파이크 기간 (년)
    spikeRate?: number;         // 스파이크 기간 인플레이션율
};

// 건강보험료 (지역가입자)
export type HealthInsurance = {
    enabled: boolean;
    mode: 'simple' | 'detailed'; // [NEW] Mode selector

    // Simple Mode
    monthlyPremium: number;     // 월 보험료 (은퇴 후)
    inflationLinked: boolean;   // 물가 연동 여부

    // Detailed Mode
    propertyValue?: number;     // 주택/건물 과세표준액 (시세의 약 60~70%)
    carValue?: number;          // 차량 가액
    isDependent?: boolean;      // 피부양자 자격 여부 (True면 0원)
};

// 세액공제 설정
export type TaxCredit = {
    enabled: boolean;
    mode: "manual" | "law_2026";
    lawYear: 2026;
    incomeBasis: "simulated_taxable_income";
    pensionSavingsContribution: number;  // 연금저축 연간 납입액
    irpContribution: number;              // IRP 연간 납입액
    creditRate?: number;                  // manual 모드에서만 사용
};

// 퇴직금 설정
export type SeveranceSettings = {
    enabled: boolean;
    estimatedAmount: number;    // 예상 퇴직금
    payoutType: 'lump_sum' | 'annuity';  // 일시금 or 연금화
    annuityYears?: number;      // 연금 수령 기간
};

// 주택연금 (역모기지)
export type ReverseAnnuity = {
    enabled: boolean;
    houseValue: number;         // 주택 가치
    startAge: number;           // 수령 시작 나이
    monthlyPayment: number;     // 예상 월 수령액 (HF 계산기 기준)
};

// --- Phase 2: Advanced Withdrawal Strategies ---

// Guardrails 전략 설정
export type GuardrailsSettings = {
    baseRate: number;           // 기본 인출률 (e.g., 0.04)
    upperThreshold: number;     // 상한 (e.g., 0.05)
    lowerThreshold: number;     // 하한 (e.g., 0.03)
    adjustmentRate: number;     // 조정폭 (e.g., 0.10 = 10%)
};

// Bucket 전략 설정
export type BucketSettings = {
    shortTermYears: number;     // 단기 버킷 기간 (현금, 1-3년)
    midTermYears: number;       // 중기 버킷 기간 (채권, 4-10년)
    shortTermReturn: number;    // 단기 버킷 수익률
    midTermReturn: number;      // 중기 버킷 수익률
    rebalanceFrequency: 'annual' | 'semi-annual';
};

// --- Phase 3: Risk Analysis ---

// 의료비/간병비 충격 시나리오
export type MedicalShock = {
    enabled: boolean;
    occurrences: Array<{
        age: number;            // 발생 연령
        amount: number;         // 금액 (양수, 지출로 처리됨)
        description?: string;   // 설명 (예: "암 치료비")
    }>;
};

// 장수 리스크 설정
export type LongevityRisk = {
    useDistribution: boolean;   // 확률적 기대 수명 사용
    averageLifeExpectancy: number; // 기대 수명 평균
    stdDevYears: number;        // 표준편차 (년)
};

// 민감도 분석 결과
export type SensitivityResult = {
    parameter: string;          // 변경된 파라미터 이름
    baseValue: number;          // 기본값
    testValues: number[];       // 테스트 값들
    successRates: number[];     // 각 값에 대한 성공률
};

// 자금 고갈 분석 결과
export type DepletionAnalysis = {
    depletionAges: number[];    // 각 경로의 고갈 연령 (-1 = 고갈 안됨)
    histogram: Array<{
        ageRange: string;       // "70-74", "75-79" 등
        count: number;          // 해당 구간 경로 수
        percentage: number;     // 비율
    }>;
    medianDepletionAge: number | null;  // 중위 고갈 연령
    neverDepletedRate: number;  // 고갈되지 않은 비율
};

// Sequence of Returns Risk 분석 결과
export type SoRRAnalysis = {
    earlyRetirementImpact: number;  // 은퇴 초 5년 수익률이 나쁠 때의 영향
    lateRetirementImpact: number;   // 은퇴 후 5년 수익률이 나쁠 때의 영향
    scenarios: Array<{
        name: string;
        successRate: number;
        finalAssetsMean: number;
    }>;
};

// --- Phase 4: Comparison & What-If ---

// 시나리오 비교 결과
export type ScenarioComparisonResult = {
    scenarios: Array<{
        id: string;
        name: string;
        summary: SimulationSummary;
        trajectoryP50: number[];  // 50th percentile trajectory
    }>;
};

// What-If 분석 파라미터
export type WhatIfParameter =
    | 'retire_age'
    | 'annual_return'
    | 'withdrawal_rate'
    | 'monthly_contribution'
    | 'initial_balance';

// --- Phase 5: UX Improvements ---

// 입력 유효성 검사 결과
export type ValidationWarning = {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
};

// 즐겨찾기 자산군
export type FavoriteAsset = {
    id: string;
    name: string;
    expectedAnnualReturn: number;
    annualVolatility: number;
    category: 'stock' | 'bond' | 'reit' | 'commodity' | 'cash' | 'other';
};

// 온보딩 상태
export type OnboardingState = {
    hasSeenIntro: boolean;
    currentStep: number;
    completedSteps: number[];
};

// --- Phase 7: Historical Backtesting & Auto-Rebalancing ---

// 역사적 자산 유형 (historicalData.ts와 동기화)
export type HistoricalAssetType =
    | 'us_stock'
    | 'global_stock'
    | 'us_bond'
    | 'korea_stock'
    | 'cash'
    | 'reit';

// 리밸런싱 설정
export type RebalancingSettings = {
    enabled: boolean;
    frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'threshold';
    thresholdPercent?: number;     // 목표 배분에서 이탈 허용 % (예: 0.05 = 5%)
    taxEfficient?: boolean;        // 세금 효율적 리밸런싱 (매수만으로)
    tradingCostPercent?: number;   // 거래 비용 % (기본 0.1%)
};

// 역사적 백테스팅 결과
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

// 리밸런싱 이벤트 (타임라인 추적용)
export type RebalancingEvent = {
    month: number;
    beforeAllocations: Record<string, number>;
    afterAllocations: Record<string, number>;
    tradingCost: number;
};
