import React, { Suspense, lazy } from "react";
import { Section, Field } from "../../common/UIComponents";
import { num } from "../../../utils/format";
import type { SimulationInput } from "../../../logic/types";

const PensionOptimizer = lazy(() => import("../../PensionOptimizer").then((m) => ({ default: m.PensionOptimizer })));

interface PensionSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
}

export function PensionSection({ input, setInput }: PensionSectionProps) {
    return (
        <>
            <Section title="🏛️ 국민연금">
                <Field
                    label="은퇴 시 예상 월 수령액"
                    value={Math.round((input.national_pension.expected_monthly_benefit_at_retirement || 0) / 10000)}
                    onChange={(v) =>
                        setInput({
                            ...input,
                            national_pension: {
                                ...input.national_pension,
                                expected_monthly_benefit_at_retirement: num(v) * 10000
                            }
                        })
                    }
                    suffix="만원"
                />
                <Field
                    label="수령 개시 연령"
                    value={input.national_pension.startAge ?? 65}
                    onChange={(v) => setInput({ ...input, national_pension: { ...input.national_pension, startAge: num(v) } })}
                    suffix="세"
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm mb-4">
                    <span className="text-base leading-none">💡</span>
                    <span className="leading-tight">65세 기준: 조기수령 -6%/년, 연기수령 +7.2%/년 자동 적용</span>
                </div>
                <div className="mt-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                            checked={input.national_pension.inflation_linked}
                            onChange={(e) =>
                                setInput({
                                    ...input,
                                    national_pension: { ...input.national_pension, inflation_linked: e.target.checked }
                                })
                            }
                        />
                        물가연동 적용
                    </label>
                </div>
            </Section>

            <Suspense fallback={<div className="text-center text-slate-500 dark:text-slate-400 py-8 animate-pulse font-medium">연금 최적화 계산 중...</div>}>
                <PensionOptimizer input={input} />
            </Suspense>

            <Section title="💼 개인연금 (연금저축/IRP)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <Field
                        label="현재 잔고"
                        value={Math.round(input.private_pension.current_balance / 10000)}
                        onChange={(v) =>
                            setInput({
                                ...input,
                                private_pension: { ...input.private_pension, current_balance: num(v) * 10000 }
                            })
                        }
                        suffix="만원"
                    />
                    <Field
                        label="월 납입액"
                        value={Math.round(input.private_pension.monthly_contribution / 10000)}
                        onChange={(v) =>
                            setInput({
                                ...input,
                                private_pension: { ...input.private_pension, monthly_contribution: num(v) * 10000 }
                            })
                        }
                        suffix="만원"
                    />
                    <Field
                        label="예상 수익률"
                        step="0.5"
                        value={input.private_pension.annual_return * 100}
                        onChange={(v) =>
                            setInput({ ...input, private_pension: { ...input.private_pension, annual_return: num(v) / 100 } })
                        }
                        suffix="%"
                    />
                    <Field
                        label="연금 수령기간"
                        value={input.private_pension.payout_years}
                        onChange={(v) => setInput({ ...input, private_pension: { ...input.private_pension, payout_years: num(v) } })}
                        suffix="년"
                    />
                </div>
            </Section>
        </>
    );
}

