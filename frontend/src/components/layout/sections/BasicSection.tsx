import React from "react";
import { Section, Field } from "../../common/UIComponents";
import { num } from "../../../utils/format";
import type { SimulationInput } from "../../../logic/types";

interface BasicSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
}

export function BasicSection({ input, setInput }: BasicSectionProps) {
    return (
        <>
            <Section title="📋 기본 설정">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <Field label="현재 나이" value={input.current_age} onChange={(v) => setInput({ ...input, current_age: num(v) })} suffix="세" />
                    <Field label="은퇴 나이" value={input.retire_age} onChange={(v) => setInput({ ...input, retire_age: num(v) })} suffix="세" />
                    <Field label="종료 나이" value={input.end_age} onChange={(v) => setInput({ ...input, end_age: num(v) })} suffix="세" />
                    <Field
                        label="물가상승률"
                        step="0.1"
                        value={input.annual_inflation * 100}
                        onChange={(v) => setInput({ ...input, annual_inflation: num(v) / 100 })}
                        suffix="%"
                    />
                </div>
            </Section>

            <Section title="🎯 시뮬레이션 설정">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <Field
                        label="시뮬레이션 횟수"
                        value={input.simulation_settings.mc_paths}
                        onChange={(v) =>
                            setInput({
                                ...input,
                                simulation_settings: {
                                    ...input.simulation_settings,
                                    mc_paths: Math.max(1, Math.floor(num(v)))
                                }
                            })
                        }
                        suffix="회"
                    />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                    💡 1,000회 이상 권장. 높을수록 정확하지만 계산 시간이 길어집니다.
                </p>
            </Section>
        </>
    );
}

