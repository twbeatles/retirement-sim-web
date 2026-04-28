import type { SimulationPlanV3 } from "../../logic/plan";
import { Section } from "../common/UIComponents";
import { createId } from "./accountFactories";
import type { ApplyPlan } from "./types";

type Props = {
    plan: SimulationPlanV3;
    applyPlan: ApplyPlan;
};

export function OneOffEventsSection({ plan, applyPlan }: Props) {
    return (
        <Section title="일회성 이벤트">
                <div className="flex flex-col gap-3">
                    {plan.expensePlan.oneOffEvents.map((event) => (
                        <div
                            key={event.id}
                            className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-3 sm:grid-cols-4 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                            <input
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={event.name}
                                onChange={(changeEvent) =>
                                    applyPlan((draft) => {
                                        const target = draft.expensePlan.oneOffEvents.find(
                                            (item) => item.id === event.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.name = changeEvent.target.value;
                                    })
                                }
                                placeholder="이벤트명"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={event.monthIndex}
                                onChange={(changeEvent) =>
                                    applyPlan((draft) => {
                                        const target = draft.expensePlan.oneOffEvents.find(
                                            (item) => item.id === event.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.monthIndex = Number(changeEvent.target.value);
                                    })
                                }
                                placeholder="월 번호"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={event.amount}
                                onChange={(changeEvent) =>
                                    applyPlan((draft) => {
                                        const target = draft.expensePlan.oneOffEvents.find(
                                            (item) => item.id === event.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.amount = Number(changeEvent.target.value);
                                    })
                                }
                                placeholder="금액"
                            />
                            <button
                                type="button"
                                className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() =>
                                    applyPlan((draft) => {
                                        draft.expensePlan.oneOffEvents =
                                            draft.expensePlan.oneOffEvents.filter(
                                                (item) => item.id !== event.id
                                            );
                                    })
                                }
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="mt-4 cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    onClick={() =>
                        applyPlan((draft) => {
                            draft.expensePlan.oneOffEvents.push({
                                id: createId("event"),
                                name: `이벤트 ${draft.expensePlan.oneOffEvents.length + 1}`,
                                monthIndex: 12,
                                amount: -5000000,
                            });
                        })
                    }
                >
                    + 일회성 이벤트 추가
                </button>
            </Section>
    );
}
