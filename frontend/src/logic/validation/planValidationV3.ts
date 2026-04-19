import type { SimulationPlanV3 } from "../plan";
import type { ValidationWarning } from "../types";
import { resolveSimulationRuleSet } from "../rules/kr";
import {
    pushError,
    pushInfo,
    pushWarning,
    requireFinite,
    requireNonNegative,
    requireRatio,
} from "./shared";

type ValidatePlanOptions = {
    validateRulebook?: boolean;
};

export function validatePlanV3(
    warnings: ValidationWarning[],
    plan: SimulationPlanV3,
    options: ValidatePlanOptions = {}
): void {
    const { validateRulebook = true } = options;

    if (plan.planVersion !== "v3") {
        pushError(warnings, "plan.planVersion", "Plan schema version is not supported.");
        return;
    }

    if (validateRulebook) {
        try {
            resolveSimulationRuleSet(plan.rulebook);
        } catch (error) {
            pushError(
                warnings,
                "plan.rulebook",
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    requireFinite(warnings, "plan.profile.currentAge", "Plan current age", plan.profile.currentAge);
    requireFinite(
        warnings,
        "plan.profile.retirementAge",
        "Plan retirement age",
        plan.profile.retirementAge
    );
    requireFinite(warnings, "plan.profile.endAge", "Plan end age", plan.profile.endAge);

    if (plan.profile.retirementAge <= plan.profile.currentAge) {
        pushError(
            warnings,
            "plan.profile.retirementAge",
            "Retirement age must be greater than current age."
        );
    }

    if (plan.profile.endAge <= plan.profile.retirementAge) {
        pushError(warnings, "plan.profile.endAge", "End age must be greater than retirement age.");
    }

    const accountIds = new Set<string>();
    plan.accounts.forEach((account, index) => {
        const fieldBase = `plan.accounts.${index}`;
        accountIds.add(account.id);

        requireFinite(warnings, `${fieldBase}.balance`, `Account "${account.name}" balance`, account.balance);
        requireNonNegative(
            warnings,
            `${fieldBase}.balance`,
            `Account "${account.name}" balance`,
            account.balance
        );

        if (account.monthlyContribution !== undefined) {
            requireFinite(
                warnings,
                `${fieldBase}.monthlyContribution`,
                `Account "${account.name}" monthly contribution`,
                account.monthlyContribution
            );
            requireNonNegative(
                warnings,
                `${fieldBase}.monthlyContribution`,
                `Account "${account.name}" monthly contribution`,
                account.monthlyContribution
            );
        }

        if (account.annualReturn !== undefined && (account.annualReturn < -0.5 || account.annualReturn > 0.5)) {
            pushWarning(
                warnings,
                `${fieldBase}.annualReturn`,
                `Account "${account.name}" annual return looks outside the usual range.`
            );
        }

        if (account.annualVolatility !== undefined && account.annualVolatility < 0) {
            pushError(
                warnings,
                `${fieldBase}.annualVolatility`,
                `Account "${account.name}" annual volatility must be 0 or greater.`
            );
        }

        requireFinite(
            warnings,
            `${fieldBase}.withdrawalPriority`,
            `Account "${account.name}" withdrawal priority`,
            account.withdrawalPriority
        );

        if (Number.isFinite(account.withdrawalPriority) && account.withdrawalPriority <= 0) {
            pushError(
                warnings,
                `${fieldBase}.withdrawalPriority`,
                `Account "${account.name}" withdrawal priority must be greater than 0.`
            );
        }

        if (account.debtTerms) {
            requireRatio(
                warnings,
                `${fieldBase}.debtTerms.annualInterest`,
                `Account "${account.name}" debt interest`,
                account.debtTerms.annualInterest
            );
            requireFinite(
                warnings,
                `${fieldBase}.debtTerms.monthlyPayment`,
                `Account "${account.name}" debt payment`,
                account.debtTerms.monthlyPayment
            );
            requireNonNegative(
                warnings,
                `${fieldBase}.debtTerms.monthlyPayment`,
                `Account "${account.name}" debt payment`,
                account.debtTerms.monthlyPayment
            );
        }

        if (account.payout?.monthlyPayout !== undefined) {
            requireFinite(
                warnings,
                `${fieldBase}.payout.monthlyPayout`,
                `Account "${account.name}" monthly payout`,
                account.payout.monthlyPayout
            );
            requireNonNegative(
                warnings,
                `${fieldBase}.payout.monthlyPayout`,
                `Account "${account.name}" monthly payout`,
                account.payout.monthlyPayout
            );
        }

        if (account.realEstate) {
            if (account.realEstate.rentalYield < 0) {
                pushError(
                    warnings,
                    `${fieldBase}.realEstate.rentalYield`,
                    `Account "${account.name}" rental yield must be 0 or greater.`
                );
            }
            if (account.realEstate.managementCost < 0) {
                pushError(
                    warnings,
                    `${fieldBase}.realEstate.managementCost`,
                    `Account "${account.name}" management cost must be 0 or greater.`
                );
            }
        }
    });

    plan.incomeStreams.forEach((stream, index) => {
        const fieldBase = `plan.incomeStreams.${index}`;
        requireFinite(
            warnings,
            `${fieldBase}.monthlyAmount`,
            `Income stream "${stream.name}" monthly amount`,
            stream.monthlyAmount
        );
        requireNonNegative(
            warnings,
            `${fieldBase}.monthlyAmount`,
            `Income stream "${stream.name}" monthly amount`,
            stream.monthlyAmount
        );
        requireFinite(warnings, `${fieldBase}.startAge`, `Income stream "${stream.name}" start age`, stream.startAge);

        if (stream.endAge !== undefined && stream.endAge <= stream.startAge) {
            pushError(
                warnings,
                `${fieldBase}.endAge`,
                `Income stream "${stream.name}" end age must be greater than the start age.`
            );
        }

        if (stream.annualGrowthRate !== undefined && !Number.isFinite(stream.annualGrowthRate)) {
            pushError(
                warnings,
                `${fieldBase}.annualGrowthRate`,
                `Income stream "${stream.name}" growth rate must be finite.`
            );
        }

        if (stream.sourceAccountId && !accountIds.has(stream.sourceAccountId)) {
            pushWarning(
                warnings,
                `${fieldBase}.sourceAccountId`,
                `Income stream "${stream.name}" references an unknown account.`
            );
        }
    });

    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.essential",
        "Essential monthly spending",
        plan.expensePlan.monthlyBuckets.essential
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.essential",
        "Essential monthly spending",
        plan.expensePlan.monthlyBuckets.essential
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.discretionary",
        "Discretionary monthly spending",
        plan.expensePlan.monthlyBuckets.discretionary
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.discretionary",
        "Discretionary monthly spending",
        plan.expensePlan.monthlyBuckets.discretionary
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.housing",
        "Housing monthly spending",
        plan.expensePlan.monthlyBuckets.housing
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.housing",
        "Housing monthly spending",
        plan.expensePlan.monthlyBuckets.housing
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.medical",
        "Medical monthly spending",
        plan.expensePlan.monthlyBuckets.medical
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.medical",
        "Medical monthly spending",
        plan.expensePlan.monthlyBuckets.medical
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.dependentSupport",
        "Dependent support monthly spending",
        plan.expensePlan.monthlyBuckets.dependentSupport
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.dependentSupport",
        "Dependent support monthly spending",
        plan.expensePlan.monthlyBuckets.dependentSupport
    );

    plan.expensePlan.oneOffEvents.forEach((event, index) => {
        if (!Number.isInteger(event.monthIndex) || event.monthIndex < 0) {
            pushError(
                warnings,
                `plan.expensePlan.oneOffEvents.${index}.monthIndex`,
                `One-off event "${event.name}" month index must be a non-negative integer.`
            );
        }
        requireFinite(
            warnings,
            `plan.expensePlan.oneOffEvents.${index}.amount`,
            `One-off event "${event.name}" amount`,
            event.amount
        );
    });

    plan.expensePlan.stageAdjustments.forEach((expense, index) => {
        const fieldBase = `plan.expensePlan.stageAdjustments.${index}`;
        requireFinite(warnings, `${fieldBase}.amount`, `Stage adjustment "${expense.name}" amount`, expense.amount);
        requireNonNegative(
            warnings,
            `${fieldBase}.amount`,
            `Stage adjustment "${expense.name}" amount`,
            expense.amount
        );
        requireFinite(warnings, `${fieldBase}.startAge`, `Stage adjustment "${expense.name}" start age`, expense.startAge);

        if (expense.endAge !== undefined && expense.endAge < expense.startAge) {
            pushError(
                warnings,
                `${fieldBase}.endAge`,
                `Stage adjustment "${expense.name}" end age cannot be before the start age.`
            );
        }

        if (expense.isRecurring && expense.intervalYears !== undefined && expense.intervalYears <= 0) {
            pushError(
                warnings,
                `${fieldBase}.intervalYears`,
                `Stage adjustment "${expense.name}" interval must be greater than 0.`
            );
        }
    });

    requireFinite(
        warnings,
        "plan.withdrawalPolicy.retirementSpendingTarget",
        "Retirement spending target",
        plan.withdrawalPolicy.retirementSpendingTarget
    );
    requireNonNegative(
        warnings,
        "plan.withdrawalPolicy.retirementSpendingTarget",
        "Retirement spending target",
        plan.withdrawalPolicy.retirementSpendingTarget
    );

    const essentialBaseline =
        plan.expensePlan.monthlyBuckets.essential +
        plan.expensePlan.monthlyBuckets.housing +
        plan.expensePlan.monthlyBuckets.medical;

    if (
        essentialBaseline > 0 &&
        plan.withdrawalPolicy.retirementSpendingTarget > 0 &&
        plan.withdrawalPolicy.retirementSpendingTarget < essentialBaseline
    ) {
        pushInfo(
            warnings,
            "plan.withdrawalPolicy.retirementSpendingTarget",
            "Retirement spending target is lower than essential baseline spending."
        );
    }
}
