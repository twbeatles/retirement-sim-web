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

const HOUSING_STATUS_LABELS: Record<string, string> = {
    own_outright: "자가 보유",
    mortgage: "주택담보대출",
    jeonse: "전세",
    rent: "월세",
};

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
            label: "연령 구간",
            complete:
                plan.profile.currentAge > 0 &&
                plan.profile.retirementAge > plan.profile.currentAge &&
                plan.profile.endAge > plan.profile.retirementAge,
            detail: `${plan.profile.currentAge}세 -> ${plan.profile.retirementAge}세 -> ${plan.profile.endAge}세`,
        },
        {
            id: "essential",
            label: "필수 생활비",
            complete: plan.expensePlan.monthlyBuckets.essential > 0,
            detail: formatMoney(plan.expensePlan.monthlyBuckets.essential),
        },
        {
            id: "housing",
            label: "주거 상태",
            complete: Boolean(plan.profile.housingStatus),
            detail: HOUSING_STATUS_LABELS[plan.profile.housingStatus] ?? plan.profile.housingStatus,
        },
        {
            id: "assets",
            label: "금융자산",
            complete: financialAssetBalance > 0,
            detail: formatMoney(financialAssetBalance),
        },
        {
            id: "pension",
            label: "연금 기준",
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
                        플랜 입력 점검
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                        필수 입력값과 플랜 구조
                    </div>
                </div>
                <div className="rounded-2xl bg-slate-100/80 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-zinc-800/80 dark:text-slate-200">
                    {completeCount}/{checklist.length} 완료
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
                                    {item.complete ? "완료" : "확인 필요"}
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
                        현재 플랜 구조
                    </div>
                    <div className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">계정</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.accounts.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">소득 흐름</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.incomeStreams.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">일회성 이벤트</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.expensePlan.oneOffEvents.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">규칙집</span>
                            <span className="font-bold text-slate-800 dark:text-white">
                                {plan.rulebook.version}
                            </span>
                        </div>
                        <div className="border-t border-slate-200/60 pt-3 text-xs font-medium leading-relaxed text-slate-500 dark:border-zinc-700/60 dark:text-slate-400">
                            간편 모드 입력값은 미리보기, 전체 시뮬레이션, 저장, 내보내기 전에
                            표준 플랜 구조로 정규화됩니다.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
