import type { HousingStatus } from "../../logic/types";
import type { SimulationPlanV3 } from "../../logic/plan";
import { clampMonteCarloPaths } from "../../logic/runtimeLimits";
import { formatMoney } from "../../utils/format";
import { Field, Section } from "../common/UIComponents";
import { HOUSING_OPTIONS } from "./constants";
import type { ApplyPlan } from "./types";

type Props = {
    plan: SimulationPlanV3;
    plannedMonthlySpending: number;
    applyPlan: ApplyPlan;
};

export function PlanBasicsSection({ plan, plannedMonthlySpending, applyPlan }: Props) {
    return (
        <Section title="플랜 편집기">
                <div className="mb-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    전문가 모드는 표준 플랜 구조를 직접 편집합니다. 미리보기, 전체 시뮬레이션,
                    저장, 내보내기는 모두 같은 정규화된 플랜을 사용합니다.
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
                    <Field
                        label="현재 나이"
                        value={plan.profile.currentAge}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.profile.currentAge = Number(value);
                            })
                        }
                        suffix="세"
                    />
                    <Field
                        label="은퇴 나이"
                        value={plan.profile.retirementAge}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.profile.retirementAge = Number(value);
                            })
                        }
                        suffix="세"
                    />
                    <Field
                        label="종료 나이"
                        value={plan.profile.endAge}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.profile.endAge = Number(value);
                            })
                        }
                        suffix="세"
                    />
                    <Field
                        label="연 물가상승률"
                        value={plan.simulationSettings.annualInflation * 100}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.simulationSettings.annualInflation = Number(value) / 100;
                            })
                        }
                        suffix="%"
                        step="0.1"
                    />
                    <Field
                        label="몬테카를로 경로 수"
                        value={plan.simulationSettings.monteCarloPaths}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.simulationSettings.monteCarloPaths = clampMonteCarloPaths(Number(value));
                            })
                        }
                        suffix="개"
                    />
                    <div className="mb-3 flex w-full min-w-0 flex-col gap-1.5">
                        <label className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                            주거 상태
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            value={plan.profile.housingStatus}
                            onChange={(event) =>
                                applyPlan((draft) => {
                                    draft.profile.housingStatus =
                                        event.target.value as HousingStatus;
                                })
                            }
                        >
                            {HOUSING_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/50">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        월 생활비 목표
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatMoney(plannedMonthlySpending)}
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        필수, 선택, 주거, 의료, 부양비 항목을 합산해 표시한 생활비 목표입니다.
                    </div>
                </div>
            </Section>
    );
}
