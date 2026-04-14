import React, { useMemo } from "react";
import { legacyInputToPlanV2 } from "../logic/planV2";
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

export const PlanGuidedChecklist = React.memo(function PlanGuidedChecklist({ input, compact = false }: Props) {
    const plan = useMemo(() => legacyInputToPlanV2(input), [input]);
    const financialAssetBalance = plan.accounts
        .filter((account) => account.type === "taxable_investment" || account.type === "cash" || account.type === "pension_savings" || account.type === "irp")
        .reduce((sum, account) => sum + account.balance, 0);

    const checklist: ChecklistItem[] = [
        {
            id: "profile",
            label: "현재/은퇴/종료 나이",
            complete: plan.profile.currentAge > 0 && plan.profile.retirementAge > plan.profile.currentAge && plan.profile.endAge > plan.profile.retirementAge,
            detail: `${plan.profile.currentAge}세 → ${plan.profile.retirementAge}세 → ${plan.profile.endAge}세`
        },
        {
            id: "expense",
            label: "월 필수생활비",
            complete: plan.expensePlan.essentialMonthly > 0,
            detail: formatMoney(plan.expensePlan.essentialMonthly)
        },
        {
            id: "housing",
            label: "주거 상태",
            complete: Boolean(plan.profile.housingStatus),
            detail: plan.profile.housingStatus
        },
        {
            id: "assets",
            label: "핵심 금융자산",
            complete: financialAssetBalance > 0,
            detail: formatMoney(financialAssetBalance)
        },
        {
            id: "pension",
            label: "국민연금/연금소득",
            complete: plan.incomeStreams.some((stream) => stream.type === "national_pension" || stream.type === "private_annuity" || stream.type === "db_pension"),
            detail: formatMoney(
                plan.incomeStreams
                    .filter((stream) => stream.type === "national_pension" || stream.type === "private_annuity" || stream.type === "db_pension")
                    .reduce((sum, stream) => sum + stream.monthlyAmount, 0)
            )
        }
    ];

    const completeCount = checklist.filter((item) => item.complete).length;

    return (
        <div className={`rounded-[1.75rem] border border-slate-200/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl ${compact ? "p-4" : "p-5 md:p-6"}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1">Plan V2 Guided Intake</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">필수 입력 체크와 계획 구조 요약</div>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/80 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {completeCount}/{checklist.length} 완료
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {checklist.map((item) => (
                        <div key={item.id} className={`rounded-2xl border p-4 ${item.complete ? "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/30 dark:bg-amber-900/10"}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-base ${item.complete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {item.complete ? "●" : "○"}
                                </span>
                                <div className="text-sm font-bold text-slate-800 dark:text-white">{item.label}</div>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">{item.detail}</div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-slate-50/70 dark:bg-zinc-800/50 p-4">
                    <div className="text-sm font-bold text-slate-800 dark:text-white mb-3">현재 계획 구조</div>
                    <div className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">계정 수</span>
                            <span className="font-bold text-slate-800 dark:text-white">{plan.accounts.length}개</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">소득 흐름 수</span>
                            <span className="font-bold text-slate-800 dark:text-white">{plan.incomeStreams.length}개</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">일회성 이벤트</span>
                            <span className="font-bold text-slate-800 dark:text-white">{plan.expensePlan.oneOffEvents.length}건</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">규칙 버전</span>
                            <span className="font-bold text-slate-800 dark:text-white">{plan.ruleSet.version}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                            간편 모드 입력값도 내부적으로는 계획 중심 `plan v2`로 정리되어 저장되고, 최종 계산은 그 계획 구조를 기반으로 수행됩니다.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
