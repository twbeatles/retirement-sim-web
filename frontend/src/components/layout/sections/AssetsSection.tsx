import React, { Suspense, lazy } from "react";
import { ExpenseManager } from "../../ExpenseManager";
import { Section, Field } from "../../common/UIComponents";
import { num } from "../../../utils/format";
import type { SimulationInput } from "../../../logic/types";

const IncomeManager = lazy(() => import("../../IncomeManager").then((m) => ({ default: m.IncomeManager })));
const PortfolioEditor = lazy(() => import("../../PortfolioEditor").then((m) => ({ default: m.PortfolioEditor })));

interface AssetsSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
}

export function AssetsSection({ input, setInput }: AssetsSectionProps) {
    return (
        <>
            <Section title="💵 현재 자산">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <Field
                        label="현재 자산(저축/투자)"
                        value={Math.round(input.general.current_balance / 10000)}
                        onChange={(v) => setInput({ ...input, general: { ...input.general, current_balance: num(v) * 10000 } })}
                        suffix="만원"
                    />
                    {!input.labor_income?.enabled && (
                        <Field
                            label="월 저축액"
                            value={Math.round(input.general.monthly_contribution / 10000)}
                            onChange={(v) =>
                                setInput({
                                    ...input,
                                    general: { ...input.general, monthly_contribution: num(v) * 10000 }
                                })
                            }
                            suffix="만원"
                        />
                    )}
                </div>
            </Section>

            <ExpenseManager input={input} onChange={setInput} />
            <Suspense fallback={<div className="text-center text-slate-500 dark:text-slate-400 py-8 animate-pulse font-medium">소득 모듈 로딩 중...</div>}>
                <IncomeManager input={input} onChange={setInput} />
            </Suspense>
            <Suspense fallback={<div className="text-center text-slate-500 dark:text-slate-400 py-8 animate-pulse font-medium">포트폴리오 모듈 로딩 중...</div>}>
                <PortfolioEditor portfolio={input.portfolio} onChange={(portfolio) => setInput({ ...input, portfolio })} />
            </Suspense>
        </>
    );
}
