import type { PlanIncomeStream, SimulationPlanV3 } from "../../logic/plan";
import { Section } from "../common/UIComponents";
import { createId } from "./accountFactories";
import { PLAN_STREAM_TYPES } from "./constants";
import type { ApplyPlan } from "./types";

type Props = {
    plan: SimulationPlanV3;
    applyPlan: ApplyPlan;
};

export function IncomeStreamsSection({ plan, applyPlan }: Props) {
    return (
        <Section title="소득 흐름">
                <div className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    세금, 건강보험료, 월별 원장, 리포트가 참조하는 표준 소득 목록입니다.
                    과세 여부와 건강보험 반영 여부는 매핑된 소득원 계산에 적용됩니다.
                </div>

                <div className="flex flex-col gap-3">
                    {plan.incomeStreams.map((stream) => (
                        <div
                            key={stream.id}
                            className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-7 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                            <select
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.type}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.type = event.target.value as PlanIncomeStream["type"];
                                    })
                                }
                            >
                                {PLAN_STREAM_TYPES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.name}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.name = event.target.value;
                                    })
                                }
                                placeholder="소득명"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.monthlyAmount}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.monthlyAmount = Number(event.target.value);
                                    })
                                }
                                placeholder="월 금액"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.startAge}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.startAge = Number(event.target.value);
                                    })
                                }
                                placeholder="시작 나이"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.endAge ?? ""}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.endAge =
                                            event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value);
                                    })
                                }
                                placeholder="종료 나이"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={stream.taxable}
                                        onChange={(event) =>
                                            applyPlan((draft) => {
                                                const target = draft.incomeStreams.find(
                                                    (item) => item.id === stream.id
                                                );
                                                if (!target) {
                                                    return;
                                                }
                                                target.taxable = event.target.checked;
                                            })
                                        }
                                    />
                                    과세
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={stream.healthInsuranceIncluded}
                                        onChange={(event) =>
                                            applyPlan((draft) => {
                                                const target = draft.incomeStreams.find(
                                                    (item) => item.id === stream.id
                                                );
                                                if (!target) {
                                                    return;
                                                }
                                                target.healthInsuranceIncluded = event.target.checked;
                                            })
                                        }
                                    />
                                    건보
                                </label>
                                <button
                                    type="button"
                                    className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() =>
                                        applyPlan((draft) => {
                                            draft.incomeStreams = draft.incomeStreams.filter(
                                                (item) => item.id !== stream.id
                                            );
                                        })
                                    }
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="mt-4 cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    onClick={() =>
                        applyPlan((draft) => {
                            draft.incomeStreams.push({
                                id: createId("income"),
                                type: "business_income",
                                name: `소득 ${draft.incomeStreams.length + 1}`,
                                monthlyAmount: 1000000,
                                startAge: draft.profile.currentAge,
                                endAge: draft.profile.retirementAge,
                                annualGrowthRate: 0,
                                inflationLinked: false,
                                taxable: true,
                                healthInsuranceIncluded: true,
                            });
                        })
                    }
                >
                    + 소득 흐름 추가
                </button>
            </Section>
    );
}
