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
                <div className="info-box">
                    <span className="info-icon">💡</span>
                    <span>65세 기준: 조기수령 -6%/년, 연기수령 +7.2%/년 자동 적용</span>
                </div>
                <div className="mt-3">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
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

            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                <PensionOptimizer input={input} />
            </Suspense>

            <Section title="💼 개인연금 (연금저축/IRP)">
                <div className="grid-2-cols">
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

