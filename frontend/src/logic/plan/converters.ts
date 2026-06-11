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
    const derivedPlan = migratePlanV2ToV3(legacyInputToPlanV2(input));
    const embeddedPlan = (input as { plan_v3?: SimulationPlanV3 }).plan_v3;
    if (embeddedPlan?.planVersion !== "v3") {
        return derivedPlan;
    }

    const embeddedAccounts = new Map(embeddedPlan.accounts.map((account) => [account.id, account]));
    const embeddedStreams = new Map(embeddedPlan.incomeStreams.map((stream) => [stream.id, stream]));

    return {
        ...derivedPlan,
        accounts: derivedPlan.accounts.map((account) => {
            const embedded = embeddedAccounts.get(account.id);
            if (!embedded) {
                return account;
            }
            return {
                ...account,
                taxTreatment: embedded.taxTreatment,
                healthInsuranceTreatment: embedded.healthInsuranceTreatment,
                withdrawalPriority: embedded.withdrawalPriority,
            };
        }),
        incomeStreams: derivedPlan.incomeStreams.map((stream) => {
            const embedded = embeddedStreams.get(stream.id);
            if (!embedded) {
                return stream;
            }
            return {
                ...stream,
                taxable: embedded.taxable,
                healthInsuranceIncluded: embedded.healthInsuranceIncluded,
            };
        }),
    };
}

export function planToLegacyInput(plan: SimulationPlanV3): SimulationInput {
    return {
        ...planV2ToLegacyInput(convertPlanV3ToV2(plan)),
        plan_v3: structuredClone(plan),
    } as SimulationInput;
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseImportedPlanEnvelope(value: unknown): SimulationPlanV3 | null {
    if (!isRecord(value)) {
        return null;
    }

    const maybeEnvelope = value as {
        schemaVersion?: number;
        plan?: unknown;
    };

    if (!isRecord(maybeEnvelope.plan)) {
        return null;
    }

    if (maybeEnvelope.schemaVersion === 3 && maybeEnvelope.plan.planVersion === "v3") {
        return structuredClone(maybeEnvelope.plan as SimulationPlanV3);
    }

    if (maybeEnvelope.schemaVersion === 2 && maybeEnvelope.plan.planVersion === "v2") {
        try {
            return migratePlanV2ToV3(maybeEnvelope.plan as SimulationPlanV2);
        } catch {
            return null;
        }
    }

    return null;
}
