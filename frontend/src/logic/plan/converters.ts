import type { SimulationInput } from "../types";
import {
    legacyInputToPlanV2,
    planV2ToLegacyInput,
    type PlanAccount as PlanAccountV2,
    type PlanIncomeStream as PlanIncomeStreamV2,
    type SimulationPlanV2,
} from "../planV2";
import type {
    PlanAccount,
    PlanExpenseBuckets,
    PlanIncomeStream,
    SimulationPlanFileEnvelopeV3,
    SimulationPlanV3,
} from "./schema";

function inferTaxTreatment(account: PlanAccountV2): PlanAccount["taxTreatment"] {
    switch (account.type) {
        case "taxable_investment":
        case "cash":
        case "investment_real_estate":
            return "taxable";
        case "pension_savings":
        case "irp":
        case "dc":
        case "db":
        case "annuity":
            return "tax_deferred";
        case "residence":
            return "tax_exempt";
        case "debt":
        default:
            return "non_taxable";
    }
}

function inferHealthInsuranceTreatment(account: PlanAccountV2): PlanAccount["healthInsuranceTreatment"] {
    switch (account.type) {
        case "investment_real_estate":
        case "residence":
            return "property_only";
        case "taxable_investment":
        case "cash":
        case "pension_savings":
        case "irp":
        case "dc":
        case "db":
        case "annuity":
            return "assessable";
        case "debt":
        default:
            return "excluded";
    }
}

function withCanonicalAccountDefaults(account: PlanAccountV2, index: number): PlanAccount {
    return {
        ...account,
        taxTreatment: inferTaxTreatment(account),
        healthInsuranceTreatment: inferHealthInsuranceTreatment(account),
        withdrawalPriority: index + 1,
    };
}

function withCanonicalIncomeDefaults(stream: PlanIncomeStreamV2): PlanIncomeStream {
    return {
        ...stream,
        annualGrowthRate: stream.annualGrowthRate ?? 0,
        inflationLinked: stream.inflationLinked ?? false,
    };
}

function buildBucketsFromV2(plan: SimulationPlanV2): PlanExpenseBuckets {
    return {
        essential: plan.expensePlan.essentialMonthly,
        discretionary: plan.expensePlan.discretionaryMonthly,
        housing: plan.expensePlan.housingMonthly,
        medical: plan.expensePlan.medicalBaselineMonthly,
        dependentSupport: 0,
    };
}

export function migratePlanV2ToV3(plan: SimulationPlanV2): SimulationPlanV3 {
    return {
        planVersion: "v3",
        profile: structuredClone(plan.profile),
        accounts: plan.accounts.map((account, index) => withCanonicalAccountDefaults(account, index)),
        incomeStreams: plan.incomeStreams.map(withCanonicalIncomeDefaults),
        expensePlan: {
            monthlyBuckets: buildBucketsFromV2(plan),
            oneOffEvents: structuredClone(plan.expensePlan.oneOffEvents),
            stageAdjustments: structuredClone(plan.expensePlan.stageAdjustments),
            medicalShocks: structuredClone(plan.expensePlan.medicalShocks),
        },
        withdrawalPolicy: structuredClone(plan.withdrawalPolicy),
        rulebook: structuredClone(plan.ruleSet),
        simulationSettings: {
            mode: plan.simulationSettings.mode,
            monteCarloPaths: plan.simulationSettings.monteCarloPaths,
            seed: plan.simulationSettings.seed,
            annualInflation: plan.simulationSettings.annualInflation,
            historicalStartYear: plan.simulationSettings.historicalStartYear,
            historicalAssetMapping: structuredClone(plan.simulationSettings.historicalAssetMapping ?? {}),
            portfolio: structuredClone(plan.simulationSettings.portfolio),
            inflationScenario: structuredClone(plan.simulationSettings.inflationScenario),
            stressTest: structuredClone(plan.simulationSettings.stressTest),
            laborIncome: structuredClone(plan.simulationSettings.laborIncome),
        },
    };
}

function convertPlanV3ToV2(plan: SimulationPlanV3): SimulationPlanV2 {
    return {
        planVersion: "v2",
        profile: structuredClone(plan.profile),
        accounts: plan.accounts.map((account) => {
            const { taxTreatment: _taxTreatment, healthInsuranceTreatment: _healthInsuranceTreatment, withdrawalPriority: _withdrawalPriority, ...rest } = account;
            void _taxTreatment;
            void _healthInsuranceTreatment;
            void _withdrawalPriority;
            return rest;
        }),
        incomeStreams: structuredClone(plan.incomeStreams),
        expensePlan: {
            essentialMonthly: plan.expensePlan.monthlyBuckets.essential,
            discretionaryMonthly: plan.expensePlan.monthlyBuckets.discretionary,
            housingMonthly: plan.expensePlan.monthlyBuckets.housing,
            medicalBaselineMonthly: plan.expensePlan.monthlyBuckets.medical,
            oneOffEvents: structuredClone(plan.expensePlan.oneOffEvents),
            stageAdjustments: structuredClone(plan.expensePlan.stageAdjustments),
            medicalShocks: structuredClone(plan.expensePlan.medicalShocks),
        },
        withdrawalPolicy: structuredClone(plan.withdrawalPolicy),
        ruleSet: structuredClone(plan.rulebook),
        simulationSettings: {
            mode: plan.simulationSettings.mode,
            monteCarloPaths: plan.simulationSettings.monteCarloPaths,
            seed: plan.simulationSettings.seed,
            annualInflation: plan.simulationSettings.annualInflation,
            historicalStartYear: plan.simulationSettings.historicalStartYear,
            historicalAssetMapping: structuredClone(plan.simulationSettings.historicalAssetMapping ?? {}),
            portfolio: structuredClone(plan.simulationSettings.portfolio),
            inflationScenario: structuredClone(plan.simulationSettings.inflationScenario),
            stressTest: structuredClone(plan.simulationSettings.stressTest),
            laborIncome: structuredClone(plan.simulationSettings.laborIncome),
            additionalPensions: [],
            businessIncome: [],
        },
    };
}

export function legacyInputToPlan(input: SimulationInput): SimulationPlanV3 {
    return migratePlanV2ToV3(legacyInputToPlanV2(input));
}

export function planToLegacyInput(plan: SimulationPlanV3): SimulationInput {
    return planV2ToLegacyInput(convertPlanV3ToV2(plan));
}

export function normalizePlan(plan: SimulationPlanV2 | SimulationPlanV3): SimulationPlanV3 {
    return plan.planVersion === "v3" ? structuredClone(plan) : migratePlanV2ToV3(plan);
}

export function createPlanFileEnvelope(plan: SimulationPlanV3): SimulationPlanFileEnvelopeV3 {
    return {
        schemaVersion: 3,
        exportedAt: Date.now(),
        plan: structuredClone(plan),
    };
}

export function parseImportedPlanEnvelope(value: unknown): SimulationPlanV3 | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const maybeEnvelope = value as {
        schemaVersion?: number;
        plan?: SimulationPlanV2 | SimulationPlanV3;
    };

    if (maybeEnvelope.schemaVersion === 3 && maybeEnvelope.plan?.planVersion === "v3") {
        return structuredClone(maybeEnvelope.plan);
    }

    if (maybeEnvelope.schemaVersion === 2 && maybeEnvelope.plan?.planVersion === "v2") {
        return migratePlanV2ToV3(maybeEnvelope.plan);
    }

    return null;
}
