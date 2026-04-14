import { INITIAL_INPUT } from "./constants";
import type {
    BucketSettings,
    BusinessIncome,
    ExpenseDefinition,
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
} from "./types";

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

function cloneBaseInput(): SimulationInput {
    return structuredClone(INITIAL_INPUT);
}

const PLAN_EXPENSE_EVENT_PREFIX = "[PLAN_EXPENSE]";

function createPlanExpenseEvents(plan: SimulationPlanV2) {
    const generatedEvents: NonNullable<SimulationInput["events"]> = [];

    for (const expense of plan.expensePlan.stageAdjustments) {
        if (expense.amount <= 0) {
            continue;
        }

        const amount = -expense.amount;
        if (expense.isRecurring && expense.intervalYears && expense.intervalYears > 0) {
            let currentAge = expense.startAge;
            const endLimit = expense.endAge ?? plan.profile.endAge;

            while (currentAge <= endLimit) {
                const monthIndex = Math.round((currentAge - plan.profile.currentAge) * 12);
                if (monthIndex >= 0) {
                    generatedEvents.push({
                        month_index: monthIndex,
                        amount,
                        name: `${PLAN_EXPENSE_EVENT_PREFIX}:${expense.id}:${expense.name} (${currentAge}세)`
                    });
                }
                currentAge += expense.intervalYears;
            }
        } else {
            const monthIndex = Math.round((expense.startAge - plan.profile.currentAge) * 12);
            if (monthIndex >= 0) {
                generatedEvents.push({
                    month_index: monthIndex,
                    amount,
                    name: `${PLAN_EXPENSE_EVENT_PREFIX}:${expense.id}:${expense.name}`
                });
            }
        }
    }

    return generatedEvents;
}

function mergePlanCollection<T extends { id: string }>(existing: T[], derived: T[]): T[] {
    const existingMap = new Map(existing.map((item) => [item.id, item]));
    const merged = derived.map((item) => ({
        ...(existingMap.get(item.id) ?? {}),
        ...item
    }));

    for (const item of existing) {
        if (!merged.some((derivedItem) => derivedItem.id === item.id)) {
            merged.push(item);
        }
    }

    return merged;
}

function mergePlanWithSnapshot(existingPlan: SimulationPlanV2, derivedPlan: SimulationPlanV2): SimulationPlanV2 {
    return {
        ...existingPlan,
        ...derivedPlan,
        profile: {
            ...existingPlan.profile,
            ...derivedPlan.profile
        },
        accounts: mergePlanCollection(existingPlan.accounts, derivedPlan.accounts),
        incomeStreams: mergePlanCollection(existingPlan.incomeStreams, derivedPlan.incomeStreams),
        expensePlan: {
            ...existingPlan.expensePlan,
            ...derivedPlan.expensePlan,
            discretionaryMonthly: existingPlan.expensePlan.discretionaryMonthly,
            housingMonthly: existingPlan.expensePlan.housingMonthly,
            medicalBaselineMonthly: existingPlan.expensePlan.medicalBaselineMonthly,
            oneOffEvents: mergePlanCollection(existingPlan.expensePlan.oneOffEvents, derivedPlan.expensePlan.oneOffEvents),
            stageAdjustments: mergePlanCollection(existingPlan.expensePlan.stageAdjustments, derivedPlan.expensePlan.stageAdjustments)
        },
        withdrawalPolicy: {
            ...existingPlan.withdrawalPolicy,
            ...derivedPlan.withdrawalPolicy,
            strategy: {
                ...existingPlan.withdrawalPolicy.strategy,
                ...derivedPlan.withdrawalPolicy.strategy
            },
            guardrails: {
                ...existingPlan.withdrawalPolicy.guardrails,
                ...derivedPlan.withdrawalPolicy.guardrails
            },
            bucket: {
                ...existingPlan.withdrawalPolicy.bucket,
                ...derivedPlan.withdrawalPolicy.bucket
            }
        },
        ruleSet: structuredClone(derivedPlan.ruleSet),
        simulationSettings: {
            ...existingPlan.simulationSettings,
            ...derivedPlan.simulationSettings,
            portfolio: structuredClone(derivedPlan.simulationSettings.portfolio),
            historicalAssetMapping: structuredClone(derivedPlan.simulationSettings.historicalAssetMapping ?? {})
        }
    };
}

export function legacyInputToPlanV2(input: SimulationInput): SimulationPlanV2 {
    const accounts: PlanAccount[] = [
        {
            id: "general_taxable",
            type: "taxable_investment",
            name: "일반 금융자산",
            currency: "KRW",
            balance: input.general.current_balance,
            monthlyContribution: input.general.monthly_contribution,
            portfolioAllocation: input.portfolio.assetClasses.map((asset) => ({
                assetClassId: asset.id,
                name: asset.name,
                allocation: asset.allocation,
                expectedAnnualReturn: asset.expectedAnnualReturn,
                annualVolatility: asset.annualVolatility,
                historicalMapping: input.simulation_settings.historical_asset_mapping?.[asset.id]
            }))
        },
        {
            id: "private_pension_savings",
            type: "pension_savings",
            name: "개인연금",
            currency: "KRW",
            balance: input.private_pension.current_balance,
            monthlyContribution: input.private_pension.monthly_contribution,
            annualReturn: input.private_pension.annual_return,
            payout: {
                payoutYears: input.private_pension.payout_years,
                annuityAnnualRate: input.private_pension.annuity_annual_rate
            }
        }
    ];

    if (input.debt.current_balance > 0 || input.debt.monthly_payment > 0) {
        accounts.push({
            id: "household_debt",
            type: "debt",
            name: "부채",
            currency: "KRW",
            balance: input.debt.current_balance,
            debtTerms: {
                annualInterest: input.debt.annual_interest,
                monthlyPayment: input.debt.monthly_payment
            }
        });
    }

    for (const asset of input.realEstate ?? []) {
        accounts.push({
            id: asset.id,
            type: asset.type === "residential" ? "residence" : "investment_real_estate",
            name: asset.name,
            currency: "KRW",
            balance: asset.currentValue,
            realEstate: {
                growthRate: asset.growthRate,
                rentalYield: asset.rentalYield,
                managementCost: asset.managementCost,
                usage: asset.type === "residential" ? "primary_residence" : "investment"
            }
        });
    }

    for (const pension of input.additionalPensions ?? []) {
        accounts.push({
            id: pension.id,
            type: pension.type === "dc" ? "dc" : pension.type === "db" ? "db" : "annuity",
            name: pension.name,
            currency: "KRW",
            balance: pension.currentValue,
            monthlyContribution: pension.monthlyContribution,
            annualReturn: pension.expectedReturn,
            payout: {
                startAge: pension.startAge,
                payoutType: pension.payoutType,
                payoutYears: pension.payoutYears,
                monthlyPayout: pension.monthlyPayout
            },
            metadata: {
                legacyType: pension.type,
                startDate: pension.startDate,
                salaryGrowth: pension.salaryGrowth,
                dbMultiplier: pension.dbMultiplier
            }
        });
    }

    if (
        input.reverse_annuity?.houseValue &&
        !accounts.some((account) => account.type === "residence")
    ) {
        accounts.push({
            id: "reverse_annuity_residence",
            type: "residence",
            name: "주거주택",
            currency: "KRW",
            balance: input.reverse_annuity.houseValue,
            realEstate: {
                growthRate: 0,
                rentalYield: 0,
                managementCost: 0,
                usage: "primary_residence"
            }
        });
    }

    const incomeStreams: PlanIncomeStream[] = [];

    if (input.labor_income?.enabled && input.labor_income.currentNetMonthlyIncome > 0) {
        incomeStreams.push({
            id: "salary_primary",
            type: "salary",
            name: "근로소득",
            monthlyAmount: input.labor_income.currentNetMonthlyIncome,
            startAge: input.current_age,
            endAge: input.retire_age,
            annualGrowthRate: 0,
            taxable: true,
            healthInsuranceIncluded: true,
            metadata: {
                savingsRate: input.labor_income.currentSavingsRate,
                events: input.labor_income.events
            }
        });
    }

    if (input.national_pension.expected_monthly_benefit_at_retirement > 0) {
        incomeStreams.push({
            id: "national_pension",
            type: "national_pension",
            name: "국민연금",
            monthlyAmount: input.national_pension.expected_monthly_benefit_at_retirement,
            startAge: input.national_pension.startAge ?? 65,
            inflationLinked: input.national_pension.inflation_linked,
            taxable: true,
            healthInsuranceIncluded: true
        });
    }

    for (const income of input.businessIncome ?? []) {
        incomeStreams.push({
            id: income.id,
            type: "business_income",
            name: income.name,
            monthlyAmount: income.monthlyIncome,
            startAge: income.startAge,
            endAge: income.endAge,
            annualGrowthRate: income.growthRate,
            taxable: true,
            healthInsuranceIncluded: true
        });
    }

    if (input.reverse_annuity?.enabled && input.reverse_annuity.monthlyPayment > 0) {
        incomeStreams.push({
            id: "reverse_mortgage",
            type: "reverse_mortgage",
            name: "주택연금",
            monthlyAmount: input.reverse_annuity.monthlyPayment,
            startAge: input.reverse_annuity.startAge,
            taxable: false,
            healthInsuranceIncluded: false
        });
    }

    if (input.severance?.enabled && input.severance.payoutType === "annuity") {
        incomeStreams.push({
            id: "severance_annuity",
            type: "severance",
            name: "퇴직금 연금",
            monthlyAmount: input.severance.estimatedAmount / Math.max(1, (input.severance.annuityYears || 1) * 12),
            startAge: input.retire_age,
            endAge: input.retire_age + (input.severance.annuityYears || 1),
            taxable: true,
            healthInsuranceIncluded: true,
            metadata: {
                estimatedAmount: input.severance.estimatedAmount
            }
        });
    }

    for (const pension of input.additionalPensions ?? []) {
        if (pension.monthlyPayout && pension.monthlyPayout > 0) {
            incomeStreams.push({
                id: `${pension.id}_payout`,
                type: pension.type === "db" ? "db_pension" : "private_annuity",
                name: `${pension.name} 수령`,
                monthlyAmount: pension.monthlyPayout,
                startAge: pension.startAge,
                taxable: true,
                healthInsuranceIncluded: true,
                sourceAccountId: pension.id
            });
        }
    }

    const oneOffEvents = (input.events ?? []).map((event, index) => ({
        id: `event_${index + 1}`,
        name: event.name ?? `이벤트 ${index + 1}`,
        monthIndex: event.month_index,
        amount: event.amount
    }));

    if (input.severance?.enabled && input.severance.payoutType === "lump_sum" && input.severance.estimatedAmount > 0) {
        oneOffEvents.push({
            id: "severance_lump_sum",
            name: "퇴직금",
            monthIndex: Math.max(0, (input.retire_age - input.current_age) * 12),
            amount: input.severance.estimatedAmount
        });
    }

    const stageAdjustments = (input.expense_definitions ?? []).map((expense: ExpenseDefinition) => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        startAge: expense.startAge,
        endAge: expense.endAge,
        isRecurring: expense.isRecurring,
        intervalYears: expense.intervalYears
    }));

    const derivedPlan: SimulationPlanV2 = {
        planVersion: "v2",
        profile: {
            country: "KR",
            householdType: "single",
            currentAge: input.current_age,
            retirementAge: input.retire_age,
            endAge: input.end_age,
            housingStatus: input.housing_status ?? "own_outright",
            longevityRisk: structuredClone(input.longevity_risk ?? INITIAL_INPUT.longevity_risk!)
        },
        accounts,
        incomeStreams,
        expensePlan: {
            essentialMonthly: input.withdrawal.targetMonthlySpending ?? input.withdrawal.fixedMonthlyAmount ?? 0,
            discretionaryMonthly: 0,
            housingMonthly: input.housing_status === "mortgage" ? input.debt.monthly_payment : 0,
            medicalBaselineMonthly: 0,
            oneOffEvents,
            stageAdjustments,
            medicalShocks: structuredClone(input.medical_shocks ?? INITIAL_INPUT.medical_shocks!)
        },
        withdrawalPolicy: {
            retirementSpendingTarget: input.withdrawal.targetMonthlySpending ?? 0,
            strategy: structuredClone(input.withdrawal),
            guardrails: structuredClone(input.guardrails ?? INITIAL_INPUT.guardrails!),
            bucket: structuredClone(input.bucket ?? INITIAL_INPUT.bucket!),
            taxCredit: structuredClone(input.tax_credit ?? INITIAL_INPUT.tax_credit!),
            healthInsurance: structuredClone(input.health_insurance ?? INITIAL_INPUT.health_insurance!),
            rebalancing: structuredClone(input.rebalancing ?? INITIAL_INPUT.rebalancing!),
            severance: structuredClone(input.severance ?? INITIAL_INPUT.severance!),
            reverseAnnuity: structuredClone(input.reverse_annuity ?? INITIAL_INPUT.reverse_annuity!)
        },
        ruleSet: structuredClone(input.rule_set ?? INITIAL_INPUT.rule_set!),
        simulationSettings: {
            mode: input.simulation_settings.mode,
            monteCarloPaths: input.simulation_settings.mc_paths,
            seed: input.simulation_settings.seed,
            annualInflation: input.annual_inflation,
            historicalStartYear: input.simulation_settings.historical_start_year,
            historicalAssetMapping: structuredClone(input.simulation_settings.historical_asset_mapping ?? {}),
            portfolio: structuredClone(input.portfolio),
            inflationScenario: structuredClone(input.inflation_scenario ?? INITIAL_INPUT.inflation_scenario!),
            stressTest: structuredClone(input.stress_test ?? INITIAL_INPUT.stress_test!),
            laborIncome: structuredClone(input.labor_income ?? INITIAL_INPUT.labor_income!),
            additionalPensions: structuredClone(input.additionalPensions ?? []),
            businessIncome: structuredClone(input.businessIncome ?? [])
        }
    };

    if (input.plan_v2?.planVersion === "v2") {
        return mergePlanWithSnapshot(structuredClone(input.plan_v2), derivedPlan);
    }

    return derivedPlan;
}

function derivePortfolioFromPlan(plan: SimulationPlanV2): PortfolioModel {
    const taxableAccount = plan.accounts.find((account) => account.type === "taxable_investment");
    if (taxableAccount?.portfolioAllocation && taxableAccount.portfolioAllocation.length > 0) {
        return {
            assetClasses: taxableAccount.portfolioAllocation.map((asset) => ({
                id: asset.assetClassId,
                name: asset.name,
                allocation: asset.allocation,
                expectedAnnualReturn: asset.expectedAnnualReturn,
                annualVolatility: asset.annualVolatility
            })),
            manualCorrelation: plan.simulationSettings.portfolio.manualCorrelation
        };
    }

    return structuredClone(plan.simulationSettings.portfolio);
}

export function planV2ToLegacyInput(plan: SimulationPlanV2): SimulationInput {
    const base = cloneBaseInput();
    const generalAccounts = plan.accounts.filter((account) => account.type === "taxable_investment" || account.type === "cash");
    const privatePensionAccount = plan.accounts.find((account) => account.type === "pension_savings" || account.type === "irp");
    const debtAccount = plan.accounts.find((account) => account.type === "debt");
    const nationalPension = plan.incomeStreams.find((stream) => stream.type === "national_pension");
    const salaryStream = plan.incomeStreams.find((stream) => stream.type === "salary");
    const reverseMortgage = plan.incomeStreams.find((stream) => stream.type === "reverse_mortgage");
    const severanceIncome = plan.incomeStreams.find((stream) => stream.id === "severance_annuity");
    const severanceLumpSum = plan.expensePlan.oneOffEvents.find((event) => event.id === "severance_lump_sum");

    const additionalPensions = plan.accounts
        .filter((account) => account.type === "dc" || account.type === "db" || account.type === "annuity")
        .map((account): PensionConfig => ({
            id: account.id,
            name: account.name,
            type: (account.metadata?.legacyType as PensionConfig["type"]) ??
                (account.type === "dc" ? "dc" : account.type === "db" ? "db" : "personal"),
            currentValue: account.balance,
            monthlyContribution: account.monthlyContribution ?? 0,
            expectedReturn: account.annualReturn,
            startDate: typeof account.metadata?.startDate === "string" ? account.metadata.startDate : undefined,
            salaryGrowth: typeof account.metadata?.salaryGrowth === "number" ? account.metadata.salaryGrowth : undefined,
            dbMultiplier: typeof account.metadata?.dbMultiplier === "number" ? account.metadata.dbMultiplier : undefined,
            startAge: account.payout?.startAge ?? plan.profile.retirementAge,
            payoutType: account.payout?.payoutType ?? "lifetime",
            payoutYears: account.payout?.payoutYears,
            monthlyPayout: account.payout?.monthlyPayout
        }));

    const expenseBucketTotal =
        plan.expensePlan.essentialMonthly
        + plan.expensePlan.discretionaryMonthly
        + plan.expensePlan.housingMonthly
        + plan.expensePlan.medicalBaselineMonthly;
    const plannedMonthlySpending = Math.max(
        plan.withdrawalPolicy.retirementSpendingTarget,
        expenseBucketTotal
    );

    const normalizedWithdrawal = structuredClone(plan.withdrawalPolicy.strategy);
    if (normalizedWithdrawal.strategy === "fixed_amount") {
        normalizedWithdrawal.fixedMonthlyAmount =
            normalizedWithdrawal.fixedMonthlyAmount && normalizedWithdrawal.fixedMonthlyAmount > 0
                ? normalizedWithdrawal.fixedMonthlyAmount
                : plannedMonthlySpending;
    } else {
        normalizedWithdrawal.targetMonthlySpending = plannedMonthlySpending;
    }

    const stageAdjustmentEvents = createPlanExpenseEvents(plan);

    return {
        ...base,
        plan_v2: structuredClone(plan),
        current_age: plan.profile.currentAge,
        retire_age: plan.profile.retirementAge,
        end_age: plan.profile.endAge,
        annual_inflation: plan.simulationSettings.annualInflation,
        rule_set: structuredClone(plan.ruleSet),
        housing_status: plan.profile.housingStatus,
        portfolio: derivePortfolioFromPlan(plan),
        general: {
            current_balance: generalAccounts.reduce((sum, account) => sum + account.balance, 0),
            monthly_contribution: generalAccounts.reduce((sum, account) => sum + (account.monthlyContribution ?? 0), 0)
        },
        private_pension: {
            current_balance: privatePensionAccount?.balance ?? 0,
            monthly_contribution: privatePensionAccount?.monthlyContribution ?? 0,
            annual_return: privatePensionAccount?.annualReturn ?? 0,
            payout_years: privatePensionAccount?.payout?.payoutYears ?? 0,
            annuity_annual_rate: privatePensionAccount?.payout?.annuityAnnualRate ?? 0
        },
        national_pension: {
            expected_monthly_benefit_at_retirement: nationalPension?.monthlyAmount ?? 0,
            inflation_linked: nationalPension?.inflationLinked ?? false,
            startAge: nationalPension?.startAge ?? 65
        },
        debt: {
            current_balance: debtAccount?.balance ?? 0,
            annual_interest: debtAccount?.debtTerms?.annualInterest ?? 0,
            monthly_payment: debtAccount?.debtTerms?.monthlyPayment ?? 0
        },
        events: [
            ...plan.expensePlan.oneOffEvents
                .filter((event) => event.id !== "severance_lump_sum")
                .map((event) => ({
                    month_index: event.monthIndex,
                    amount: event.amount,
                    name: event.name
                })),
            ...stageAdjustmentEvents
        ],
        expense_definitions: plan.expensePlan.stageAdjustments.map((expense) => ({
            id: expense.id,
            name: expense.name,
            amount: expense.amount,
            startAge: expense.startAge,
            isRecurring: expense.isRecurring,
            intervalYears: expense.intervalYears,
            endAge: expense.endAge
        })),
        withdrawal: normalizedWithdrawal,
        simulation_settings: {
            mode: plan.simulationSettings.mode,
            mc_paths: plan.simulationSettings.monteCarloPaths,
            seed: plan.simulationSettings.seed,
            historical_start_year: plan.simulationSettings.historicalStartYear,
            historical_asset_mapping: structuredClone(plan.simulationSettings.historicalAssetMapping ?? {})
        },
        rebalancing: structuredClone(plan.withdrawalPolicy.rebalancing),
        stress_test: structuredClone(plan.simulationSettings.stressTest),
        inflation_scenario: structuredClone(plan.simulationSettings.inflationScenario),
        health_insurance: structuredClone(plan.withdrawalPolicy.healthInsurance),
        tax_credit: structuredClone(plan.withdrawalPolicy.taxCredit),
        severance: {
            ...structuredClone(plan.withdrawalPolicy.severance),
            enabled: plan.withdrawalPolicy.severance.enabled || Boolean(severanceIncome || severanceLumpSum),
            estimatedAmount: severanceLumpSum?.amount
                ?? (severanceIncome?.metadata?.estimatedAmount as number | undefined)
                ?? plan.withdrawalPolicy.severance.estimatedAmount
        },
        reverse_annuity: {
            ...structuredClone(plan.withdrawalPolicy.reverseAnnuity),
            enabled: plan.withdrawalPolicy.reverseAnnuity.enabled || Boolean(reverseMortgage),
            houseValue: plan.withdrawalPolicy.reverseAnnuity.houseValue
                || plan.accounts.find((account) => account.id === "reverse_annuity_residence" || account.type === "residence")?.balance
                || 0,
            startAge: reverseMortgage?.startAge ?? plan.withdrawalPolicy.reverseAnnuity.startAge,
            monthlyPayment: reverseMortgage?.monthlyAmount ?? plan.withdrawalPolicy.reverseAnnuity.monthlyPayment
        },
        guardrails: structuredClone(plan.withdrawalPolicy.guardrails),
        bucket: structuredClone(plan.withdrawalPolicy.bucket),
        medical_shocks: structuredClone(plan.expensePlan.medicalShocks),
        longevity_risk: structuredClone(plan.profile.longevityRisk),
        labor_income: salaryStream
            ? {
                enabled: true,
                currentNetMonthlyIncome: salaryStream.monthlyAmount,
                currentSavingsRate: Number(salaryStream.metadata?.savingsRate ?? base.labor_income!.currentSavingsRate),
                events: Array.isArray(salaryStream.metadata?.events)
                    ? structuredClone(salaryStream.metadata.events as LaborIncomeSettings["events"])
                    : structuredClone(base.labor_income!.events)
            }
            : structuredClone(plan.simulationSettings.laborIncome),
        realEstate: plan.accounts
            .filter((account) => account.type === "residence" || account.type === "investment_real_estate")
            .filter((account) => account.id !== "reverse_annuity_residence")
            .map((account) => ({
                id: account.id,
                name: account.name,
                currentValue: account.balance,
                growthRate: account.realEstate?.growthRate ?? 0,
                rentalYield: account.realEstate?.rentalYield ?? 0,
                managementCost: account.realEstate?.managementCost ?? 0,
                type: account.type === "residence" ? "residential" : "investment"
            })),
        additionalPensions,
        businessIncome: plan.incomeStreams
            .filter((stream) => stream.type === "business_income" || stream.type === "rental_income")
            .map((stream) => ({
                id: stream.id,
                name: stream.name,
                monthlyIncome: stream.monthlyAmount,
                growthRate: stream.annualGrowthRate ?? 0,
                startAge: stream.startAge,
                endAge: stream.endAge ?? plan.profile.endAge
            }))
    };
}
