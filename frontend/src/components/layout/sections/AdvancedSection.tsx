import React, { Suspense, lazy } from "react";
import { WithdrawalSettings } from "../../WithdrawalSettings";
import { AdvancedSettings } from "../../AdvancedSettings";
import { FavoriteAssets } from "../../FavoriteAssets";
import { PlanV2Editor } from "../../PlanV2Editor";
import { Section, Field } from "../../common/UIComponents";
import { num } from "../../../utils/format";
import type { SimulationInput } from "../../../logic/types";

const BacktestingPanel = lazy(() => import("../../BacktestingPanel").then((m) => ({ default: m.BacktestingPanel })));

interface AdvancedSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
}

export function AdvancedSection({ input, setInput }: AdvancedSectionProps) {
    return (
        <>
            <PlanV2Editor input={input} onChange={setInput} />

            <Suspense fallback={<div className="text-center text-slate-500 dark:text-slate-400 py-8 animate-pulse font-medium">Loading...</div>}>
                <BacktestingPanel input={input} onInputChange={setInput} />
            </Suspense>

            <WithdrawalSettings withdrawal={input.withdrawal} onChange={(withdrawal) => setInput({ ...input, withdrawal })} />

            <Section title="⚠️ 리스크 관리 (Stress Test)">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-orange-600 bg-slate-100 border-slate-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={input.stress_test?.enabled ?? false}
                        onChange={(e) =>
                            setInput({
                                ...input,
                                stress_test: {
                                    ...(input.stress_test ?? {
                                        startFromRetirement: true,
                                        durationMonths: 24,
                                        annualDeclineRate: 0.2
                                    }),
                                    enabled: e.target.checked
                                }
                            })
                        }
                    />
                    시장 폭락 시뮬레이션 적용
                </label>

                {input.stress_test?.enabled && (
                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl">
                        <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-start gap-1">
                            <span className="mt-0.5">*</span>
                            <span>주식 시장이 특정 기간 동안 매년 폭락한다고 가정합니다.</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            <Field
                                label="연간 하락률"
                                step="5"
                                value={input.stress_test.annualDeclineRate * 100}
                                onChange={(v) =>
                                    setInput({
                                        ...input,
                                        stress_test: { ...input.stress_test!, annualDeclineRate: num(v) / 100 }
                                    })
                                }
                                suffix="%"
                            />
                            <Field
                                label="지속 기간"
                                value={input.stress_test.durationMonths}
                                onChange={(v) =>
                                    setInput({
                                        ...input,
                                        stress_test: { ...input.stress_test!, durationMonths: num(v) }
                                    })
                                }
                                suffix="개월"
                            />
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-200/50 dark:border-orange-900/30">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-orange-600 bg-slate-100 border-slate-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={input.stress_test.startFromRetirement}
                                    onChange={(e) =>
                                        setInput({
                                            ...input,
                                            stress_test: { ...input.stress_test!, startFromRetirement: e.target.checked }
                                        })
                                    }
                                />
                                은퇴 시점부터 발생 (수익률 순서 위험)
                            </label>
                        </div>
                    </div>
                )}
            </Section>

            <AdvancedSettings input={input} onChange={setInput} />
            <FavoriteAssets portfolio={input.portfolio} onChange={(portfolio) => setInput({ ...input, portfolio })} />
        </>
    );
}

