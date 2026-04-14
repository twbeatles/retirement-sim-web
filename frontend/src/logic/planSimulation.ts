import { calculateRegionalHealthInsurance } from "./koreaTax";
import { runSimulation } from "./engine";
import { planV2ToLegacyInput, type SimulationPlanV2 } from "./planV2";
import type { LedgerTimelineRow, SimulationResult, SimulationRunOptions, TimelineRow } from "./types";

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

function buildMedicalShockMap(plan: SimulationPlanV2): Map<number, number> {
    const map = new Map<number, number>();

    for (const occurrence of plan.expensePlan.medicalShocks.occurrences) {
        const month = Math.max(0, Math.round((occurrence.age - plan.profile.currentAge) * 12));
        map.set(month, (map.get(month) ?? 0) + occurrence.amount);
    }

    return map;
}

function calculateStageAdjustmentMonthlyAmount(
    age: number,
    adjustment: SimulationPlanV2["expensePlan"]["stageAdjustments"][number]
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
    plan: SimulationPlanV2,
    timeline: TimelineRow[]
): LedgerTimelineRow[] {
    const medicalShockByMonth = buildMedicalShockMap(plan);

    return timeline.map((row) => {
        const activeStreams = plan.incomeStreams.filter((stream) =>
            isStreamActive(row.age, stream.startAge, stream.endAge)
        );

        const salary = activeStreams
            .filter((stream) => stream.type === "salary")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const businessIncome = activeStreams
            .filter((stream) => stream.type === "business_income")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const rentalIncome = activeStreams
            .filter((stream) => stream.type === "rental_income")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const severance = activeStreams
            .filter((stream) => stream.type === "severance")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);
        const reverseMortgage = activeStreams
            .filter((stream) => stream.type === "reverse_mortgage")
            .reduce((sum, stream) => sum + stream.monthlyAmount, 0);

        const oneOffNet = plan.expensePlan.oneOffEvents
            .filter((event) => event.monthIndex === row.month)
            .reduce((sum, event) => sum + event.amount, 0);
        const oneOffIncome = Math.max(0, oneOffNet);
        const oneOffExpense = Math.max(0, -oneOffNet);

        const stageAdjustments = plan.expensePlan.stageAdjustments
            .reduce((sum, adjustment) => sum + calculateStageAdjustmentMonthlyAmount(row.age, adjustment), 0);
        const medicalShock = medicalShockByMonth.get(row.month) ?? 0;

        const healthInsuranceAssessableIncomeMonthly = activeStreams
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
                    plan.ruleSet
                );
            }
        }

        const taxableIncomeMonthly =
            salary
            + businessIncome
            + rentalIncome
            + row.cashflow.nationalPension
            + row.cashflow.privatePension
            + row.cashflow.additionalPension
            + severance;

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
            + row.cashflow.withdrawalGross;

        const totalExpenses =
            plan.expensePlan.essentialMonthly
            + plan.expensePlan.discretionaryMonthly
            + plan.expensePlan.housingMonthly
            + plan.expensePlan.medicalBaselineMonthly
            + medicalShock
            + stageAdjustments
            + oneOffExpense
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
                essential: plan.expensePlan.essentialMonthly,
                discretionary: plan.expensePlan.discretionaryMonthly,
                housing: plan.expensePlan.housingMonthly,
                medicalBaseline: plan.expensePlan.medicalBaselineMonthly,
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

export function runSimulationPlanV2(
    plan: SimulationPlanV2,
    options?: SimulationRunOptions
): SimulationResult {
    const legacyInput = planV2ToLegacyInput(plan);
    const result = runSimulation(legacyInput, options);

    if (result.mode === "deterministic") {
        return {
            ...result,
            ledgerTimeline: buildLedgerTimelineFromPlan(plan, result.timeline)
        };
    }

    const firstSample = result.sampleTimelines[0];
    return {
        ...result,
        ledgerTimeline: firstSample ? buildLedgerTimelineFromPlan(plan, firstSample) : undefined
    };
}

export function runSimulationPlanBatchV2(
    plans: SimulationPlanV2[],
    options?: SimulationRunOptions
): SimulationResult[] {
    return plans.map((plan) => runSimulationPlanV2(plan, options));
}
