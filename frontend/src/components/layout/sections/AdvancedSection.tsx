import React, { Suspense, lazy } from "react";
import { WithdrawalSettings } from "../../WithdrawalSettings";
import { AdvancedSettings } from "../../AdvancedSettings";
import { FavoriteAssets } from "../../FavoriteAssets";
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
            <Suspense fallback={<div className="text-center text-muted py-4">Loading...</div>}>
                <BacktestingPanel input={input} onInputChange={setInput} />
            </Suspense>

            <WithdrawalSettings withdrawal={input.withdrawal} onChange={(withdrawal) => setInput({ ...input, withdrawal })} />

            <Section title="⚠️ 리스크 관리 (Stress Test)">
                <label className="checkbox-label font-semibold">
                    <input
                        type="checkbox"
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
                    <div className="stress-test-box mt-3">
                        <div className="text-xs text-danger mb-2">
                            * 주식 시장이 특정 기간 동안 매년 폭락한다고 가정합니다.
                        </div>
                        <div className="grid-2-cols">
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
                        <div className="mt-2">
                            <label className="checkbox-label text-sm">
                                <input
                                    type="checkbox"
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

