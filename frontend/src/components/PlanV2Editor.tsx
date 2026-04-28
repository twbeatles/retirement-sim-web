import React, { useMemo } from "react";
import {
    legacyInputToPlan,
    planToLegacyInput,
    type SimulationPlanV3,
} from "../logic/plan";
import type { SimulationInput } from "../logic/types";
import { ExpensePlanSection } from "./plan-editor/ExpensePlanSection";
import { IncomeStreamsSection } from "./plan-editor/IncomeStreamsSection";
import { OneOffEventsSection } from "./plan-editor/OneOffEventsSection";
import { PlanAccountsSection } from "./plan-editor/PlanAccountsSection";
import { PlanBasicsSection } from "./plan-editor/PlanBasicsSection";

interface Props {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

export const PlanV2Editor = React.memo(function PlanV2Editor({
    input,
    onChange,
}: Props) {
    const plan = useMemo(() => legacyInputToPlan(input), [input]);
    const plannedMonthlySpending =
        plan.expensePlan.monthlyBuckets.essential +
        plan.expensePlan.monthlyBuckets.discretionary +
        plan.expensePlan.monthlyBuckets.housing +
        plan.expensePlan.monthlyBuckets.medical +
        plan.expensePlan.monthlyBuckets.dependentSupport;

    const taxableAccount = plan.accounts.find((account) => account.id === "general_taxable");
    const privatePensionAccount = plan.accounts.find(
        (account) => account.id === "private_pension_savings"
    );
    const debtAccount = plan.accounts.find((account) => account.id === "household_debt");

    const applyPlan = (updater: (draft: SimulationPlanV3) => void) => {
        const draft = structuredClone(plan);
        updater(draft);
        onChange(planToLegacyInput(draft));
    };

    return (
        <>
            <PlanBasicsSection
                plan={plan}
                plannedMonthlySpending={plannedMonthlySpending}
                applyPlan={applyPlan}
            />

            <PlanAccountsSection
                taxableAccount={taxableAccount}
                privatePensionAccount={privatePensionAccount}
                debtAccount={debtAccount}
                applyPlan={applyPlan}
            />

            <IncomeStreamsSection plan={plan} applyPlan={applyPlan} />

            <ExpensePlanSection
                plan={plan}
                plannedMonthlySpending={plannedMonthlySpending}
                applyPlan={applyPlan}
            />

            <OneOffEventsSection plan={plan} applyPlan={applyPlan} />
        </>
    );
});

export const PlanEditor = PlanV2Editor;
