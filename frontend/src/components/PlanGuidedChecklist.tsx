import React, { useMemo } from "react";
import { legacyInputToPlan } from "../logic/plan";
import type { SimulationInput } from "../logic/types";
import { formatMoney } from "../utils/format";

type ChecklistItem = {
    id: string;
    label: string;
    complete: boolean;
    detail: string;
};

interface Props {
    input: SimulationInput;
    compact?: boolean;
}

const PENSION_STREAM_TYPES = new Set([
    "national_pension",
    "private_annuity",
    "db_pension",
]);

export const PlanGuidedChecklist = React.memo(function PlanGuidedChecklist({
    input,
    compact = false,
}: Props) {
    const plan = useMemo(() => legacyInputToPlan(input), [input]);

    const financialAssetBalance = plan.accounts
        .filter((account) =>
            account.type === "taxable_investment" ||
            account.type === "cash" ||
            account.type === "pension_savings" ||
            account.type === "irp"
        )
        .reduce((sum, account) => sum + account.balance, 0);

    const pensionIncome = plan.incomeStreams
        .filter((stream) => PENSION_STREAM_TYPES.has(stream.type))
        .reduce((sum, stream) => sum + stream.monthlyAmount, 0);

    const checklist: ChecklistItem[] = [
        {
            id: "profile",
            label: "Age horizon",
            complete:
                plan.profile.currentAge > 0 &&
                plan.profile.retirementAge > plan.profile.currentAge &&
                plan.profile.endAge > plan.profile.retirementAge,
            detail: `${plan.profile.currentAge} -> ${plan.profile.retirementAge} -> ${plan.profile.endAge}`,
        },
        {
            id: "essential",
            label: "Essential spending",
            complete: plan.expensePlan.monthlyBuckets.essential > 0,
            detail: formatMoney(plan.expensePlan.monthlyBuckets.essential),
        },
        {
            id: "housing",
            label: "Housing status",
            complete: Boolean(plan.profile.housingStatus),
            detail: plan.profile.housingStatus,
        },
        {
            id: "assets",
            label: "Financial assets",
            complete: financialAssetBalance > 0,
            detail: formatMoney(financialAssetBalance),
        },
        {
            id: "pension",
            label: "Pension baseline",
            complete: pensionIncome > 0,
            detail: formatMoney(pensionIncome),
        },
    ];

    const completeCount = checklist.filter((item) => item.complete).length;

    return (
        <div
            className={`rounded-[1.75rem] border border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/60 ${
                compact ? "p-4" : "p-5 md:p-6"
            }`}
        >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Plan Guided Intake
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                        Required inputs and plan structure
                    </div>
                </div>
                <div className="rounded-2xl bg-slate-100/80 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-zinc-800/80 dark:text-slate-200">
                    {completeCount}/{checklist.length} complete
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {checklist.map((item) => (
                        <div
                            key={item.id}
                            className={`rounded-2xl border p-4 ${
                                item.complete
                                    ? "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-900/10"
                                    : "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/30 dark:bg-amber-900/10"
                            }`}
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <span
                                    className={`text-base ${
                                        item.complete
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-amber-600 dark:text-amber-400"
                                    }`}
                                >
                                    {item.complete ? "OK" : "TODO"}
                                </span>
                                <div className="text-sm font-bold text-slate-800 dark:text-white">
                                    {item.label}
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                {item.detail}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/50">
                    <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                        Current plan shape
                    </div>
                    <div className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">Accounts</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.accounts.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">Income streams</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.incomeStreams.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">One-off events</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.expensePlan.oneOffEvents.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">Rulebook</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.rulebook.version}
                            </span>
                        </div>
                        <div className="border-t border-slate-200/60 pt-3 text-xs font-medium leading-relaxed text-slate-500 dark:border-zinc-700/60 dark:text-slate-400">
                            Simple mode inputs are normalized into the canonical plan before
                            preview, full simulation, storage, and export.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
