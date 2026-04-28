import { calculateRegionalHealthInsurance } from "./koreaTax";
import { runSimulation } from "./engine";
import { normalizePlan, planToLegacyInput, type SimulationPlanV3 } from "./plan";
import type { SimulationPlanV2 } from "./planV2";
import type { LedgerTimelineRow, SimulationResult, SimulationRunOptions, TimelineRow } from "./types";

const INCOME_SOURCE_TYPES = {
    salary: ["salary"],
    businessIncome: ["business_income"],
    rentalIncome: ["rental_income"],
    nationalPension: ["national_pension"],
    privatePension: ["private_annuity"],
    additionalPension: ["private_annuity", "db_pension"],
    severance: ["severance"],
    reverseMortgage: ["reverse_mortgage"],
} satisfies Record<string, Array<SimulationPlanV3["incomeStreams"][number]["type"]>>;

function isStreamActive(
    age: number,
    startAge: number,
    endAge?: number
) {
    if (age < startAge) {
        return false;
    }
    if (endAge !== undefined && age >= endAge) {
        return false;
    }
    return true;
}

function buildMedicalShockMap(plan: SimulationPlanV3): Map<number, number> {
    const map = new Map<number, number>();

    for (const occurrence of plan.expensePlan.medicalShocks.occurrences) {
        const month = Math.max(0, Math.round((occurrence.age - plan.profile.currentAge) * 12));
        map.set(month, (map.get(month) ?? 0) + occurrence.amount);
    }

    return map;
}

function calculateStageAdjustmentMonthlyAmount(
    age: number,
    adjustment: SimulationPlanV3["expensePlan"]["stageAdjustments"][number]
) {
    if (age < adjustment.startAge) {
        return 0;
    }
    if (adjustment.endAge !== undefined && age >= adjustment.endAge) {
        return 0;
    }

    if (!adjustment.isRecurring) {
        return age >= adjustment.startAge && age < adjustment.startAge + (1 / 12) ? adjustment.amount : 0;
    }

    if (!adjustment.intervalYears || adjustment.intervalYears <= 1) {
        return adjustment.amount;
    }

    const yearsSinceStart = age - adjustment.startAge;
    const periodIndex = Math.round(yearsSinceStart * 12);
    const intervalMonths = adjustment.intervalYears * 12;
    return periodIndex % intervalMonths === 0 ? adjustment.amount : 0;
}

export function buildLedgerTimelineFromPlan(
    plan: SimulationPlanV3,
    timeline: TimelineRow[]
): LedgerTimelineRow[] {
    const medicalShockByMonth = buildMedicalShockMap(plan);

    return timeline.map((row) => {
        const activeStreams = plan.incomeStreams.filter((stream) =>
            isStreamActive(row.age, stream.startAge, stream.endAge)
        );
        const sourceMap = row.cashflow.sources;
        const inflationFactor = row.inflationFactor ?? 1;
        const inflate = (amount: number) => amount * inflationFactor;
        const hasTaxableStreamForSource = (
            sourceTypes: Array<SimulationPlanV3["incomeStreams"][number]["type"]>
        ) => {
            const matchingStreams = activeStreams.filter((stream) => sourceTypes.includes(stream.type));
            return matchingStreams.length === 0 || matchingStreams.some((stream) => stream.taxable);
        };
        const taxableSourceAmount = (
            sourceTypes: Array<SimulationPlanV3["incomeStreams"][number]["type"]>,
            amount: number
        ) => hasTaxableStreamForSource(sourceTypes) ? amount : 0;

        const salary = sourceMap?.salary ?? activeStreams
            .filter((stream) => stream.type === "salary")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const businessIncome = sourceMap?.businessIncome ?? activeStreams
            .filter((stream) => stream.type === "business_income")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const rentalIncome = sourceMap?.rentalIncome ?? activeStreams
            .filter((stream) => stream.type === "rental_income")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const severance = sourceMap?.severance ?? activeStreams
            .filter((stream) => stream.type === "severance")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const reverseMortgage = sourceMap?.reverseMortgage ?? activeStreams
            .filter((stream) => stream.type === "reverse_mortgage")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);

        const oneOffNet = plan.expensePlan.oneOffEvents
            .filter((event) => event.monthIndex === row.month)
            .reduce((sum, event) => sum + event.amount, 0);
        const oneOffIncome = sourceMap?.oneOffIncome ?? inflate(Math.max(0, oneOffNet));
        const oneOffExpense = sourceMap?.oneOffExpense ?? inflate(Math.max(0, -oneOffNet));

        const stageAdjustments = sourceMap
            ? 0
            : plan.expensePlan.stageAdjustments
                .reduce((sum, adjustment) => sum + inflate(calculateStageAdjustmentMonthlyAmount(row.age, adjustment)), 0);
        const medicalShock = sourceMap?.medicalShock ?? medicalShockByMonth.get(row.month) ?? 0;
        const essentialExpense = inflate(plan.expensePlan.monthlyBuckets.essential);
        const discretionaryExpense = inflate(plan.expensePlan.monthlyBuckets.discretionary);
        const housingExpense = plan.profile.housingStatus === "mortgage" && (sourceMap?.debtService ?? 0) > 0
            ? 0
            : inflate(plan.expensePlan.monthlyBuckets.housing);
        const medicalBaseline = inflate(plan.expensePlan.monthlyBuckets.medical);
        const dependentSupport = inflate(plan.expensePlan.monthlyBuckets.dependentSupport);

        const healthInsuranceAssessableIncomeMonthly =
            row.cashflow.assessableIncomeForHealthInsurance
            ?? activeStreams
                .filter((stream) => stream.healthInsuranceIncluded)
                .reduce((sum, stream) => sum + stream.monthlyAmount, 0);

        let healthInsurancePremium = row.cashflow.healthInsurancePremium ?? 0;
        if (healthInsurancePremium === 0 && plan.withdrawalPolicy.healthInsurance.enabled) {
            const hi = plan.withdrawalPolicy.healthInsurance;
            if (hi.mode === "simple") {
                healthInsurancePremium = hi.monthlyPremium;
            } else if (!hi.isDependent) {
                healthInsurancePremium = calculateRegionalHealthInsurance(
                    healthInsuranceAssessableIncomeMonthly * 12,
                    (hi.propertyValue ?? 0) + row.realEstate,
                    hi.carValue ?? 0,
                    plan.rulebook
                );
            }
        }

        const taxableIncomeMonthly =
            taxableSourceAmount(INCOME_SOURCE_TYPES.salary, salary)
            + taxableSourceAmount(INCOME_SOURCE_TYPES.businessIncome, businessIncome)
            + taxableSourceAmount(INCOME_SOURCE_TYPES.rentalIncome, rentalIncome)
            + taxableSourceAmount(INCOME_SOURCE_TYPES.nationalPension, row.cashflow.nationalPension)
            + taxableSourceAmount(INCOME_SOURCE_TYPES.privatePension, row.cashflow.privatePension)
            + taxableSourceAmount(INCOME_SOURCE_TYPES.additionalPension, row.cashflow.additionalPension)
            + taxableSourceAmount(INCOME_SOURCE_TYPES.severance, severance)
            + (sourceMap?.interestDividend ?? 0)
            + (sourceMap?.realizedCapitalGain ?? 0);

        const totalGross =
            salary
            + businessIncome
            + rentalIncome
            + severance
            + reverseMortgage
            + oneOffIncome
            + row.cashflow.nationalPension
            + row.cashflow.privatePension
            + row.cashflow.additionalPension
            + row.cashflow.withdrawalGross
            + (sourceMap?.interestDividend ?? 0)
            + (sourceMap?.realizedCapitalGain ?? 0);

        const totalExpenses =
            essentialExpense
            + discretionaryExpense
            + housingExpense
            + medicalBaseline
            + dependentSupport
            + medicalShock
            + stageAdjustments
            + oneOffExpense
            + (sourceMap?.debtService ?? 0)
            + (sourceMap?.tradingCost ?? 0)
            + row.cashflow.taxPaid
            + healthInsurancePremium;

        return {
            month: row.month,
            age: row.age,
            isRetired: row.isRetired,
            incomes: {
                salary,
                nationalPension: row.cashflow.nationalPension,
                privatePension: row.cashflow.privatePension,
                additionalPension: row.cashflow.additionalPension,
                businessIncome,
                rentalIncome,
                severance,
                reverseMortgage,
                oneOffIncome,
                withdrawalGross: row.cashflow.withdrawalGross,
                totalGross,
                totalNet: totalGross - row.cashflow.taxPaid - healthInsurancePremium
            },
            expenses: {
                essential: essentialExpense,
                discretionary: discretionaryExpense,
                housing: housingExpense,
                medicalBaseline,
                medicalShock,
                stageAdjustments,
                oneOffExpense,
                taxPaid: row.cashflow.taxPaid,
                healthInsurancePremium,
                total: totalExpenses
            },
            tax: {
                taxableIncomeMonthly,
                healthInsuranceAssessableIncomeMonthly,
                taxPaid: row.cashflow.taxPaid,
                taxCreditApplied: row.cashflow.taxCreditApplied ?? 0
            },
            balances: {
                taxableInvestments: row.general,
                privatePension: row.privatePension,
                realEstate: row.realEstate,
                additionalPensions: row.additionalPension,
                debt: row.debt,
                totalAssets: row.totalAssets,
                totalAssetsReal: row.totalAssetsReal
            }
        };
    });
}

export function runSimulationPlan(
    plan: SimulationPlanV2 | SimulationPlanV3,
    options?: SimulationRunOptions
): SimulationResult {
    const normalizedPlan = normalizePlan(plan);
    const legacyInput = planToLegacyInput(normalizedPlan);
    const result = runSimulation(legacyInput, options, normalizedPlan);

    if (result.mode === "deterministic") {
        const representativeLedger = buildLedgerTimelineFromPlan(normalizedPlan, result.timeline);
        return {
            ...result,
            ledgerTimeline: representativeLedger,
            display: {
                representative: result.display.representative
                    ? {
                        ...result.display.representative,
                        ledgerTimeline: representativeLedger
                    }
                    : undefined,
                samples: result.display.samples.map((sample) => ({
                    ...sample,
                    ledgerTimeline: buildLedgerTimelineFromPlan(normalizedPlan, sample.timeline)
                }))
            }
        };
    }

    const representativeLedger = result.display.representative
        ? buildLedgerTimelineFromPlan(normalizedPlan, result.display.representative.timeline)
        : undefined;
    return {
        ...result,
        ledgerTimeline: representativeLedger,
        display: {
            representative: result.display.representative
                ? {
                    ...result.display.representative,
                    ledgerTimeline: representativeLedger
                }
                : undefined,
            samples: result.display.samples.map((sample) => ({
                ...sample,
                ledgerTimeline: buildLedgerTimelineFromPlan(normalizedPlan, sample.timeline)
            }))
        }
    };
}

export function runSimulationPlanBatch(
    plans: SimulationPlanV3[],
    options?: SimulationRunOptions
): SimulationResult[] {
    return plans.map((plan) => runSimulationPlan(plan, options));
}

export const runSimulationPlanV2 = runSimulationPlan;
export const runSimulationPlanBatchV2 = runSimulationPlanBatch;
