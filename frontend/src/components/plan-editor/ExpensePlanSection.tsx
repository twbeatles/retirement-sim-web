import type { SimulationPlanV3 } from "../../logic/plan";
import { formatMoney } from "../../utils/format";
import { Field, Section } from "../common/UIComponents";
import type { ApplyPlan } from "./types";

type Props = {
    plan: SimulationPlanV3;
    plannedMonthlySpending: number;
    applyPlan: ApplyPlan;
};

export function ExpensePlanSection({ plan, plannedMonthlySpending, applyPlan }: Props) {
    return (
        <Section title="지출 계획">
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
                    <Field
                        label="필수 생활비"
                        value={Math.round(plan.expensePlan.monthlyBuckets.essential / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.essential = Number(value) * 10000;
                            })
                        }
                        suffix="만원"
                    />
                    <Field
                        label="선택 지출"
                        value={Math.round(plan.expensePlan.monthlyBuckets.discretionary / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.discretionary =
                                    Number(value) * 10000;
                            })
                        }
                        suffix="만원"
                    />
                    <Field
                        label="주거비"
                        value={Math.round(plan.expensePlan.monthlyBuckets.housing / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.housing = Number(value) * 10000;
                            })
                        }
                        suffix="만원"
                    />
                    <Field
                        label="의료비"
                        value={Math.round(plan.expensePlan.monthlyBuckets.medical / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.medical = Number(value) * 10000;
                            })
                        }
                        suffix="만원"
                    />
                    <Field
                        label="부양비"
                        value={Math.round(
                            plan.expensePlan.monthlyBuckets.dependentSupport / 10000
                        )}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.dependentSupport =
                                    Number(value) * 10000;
                            })
                        }
                        suffix="만원"
                    />
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/50">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        월 지출 계획 합계
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatMoney(plannedMonthlySpending)}
                    </div>
                </div>
            </Section>
    );
}
