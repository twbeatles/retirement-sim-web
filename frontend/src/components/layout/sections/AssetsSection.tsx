import React from "react";
import { ExpenseManager } from "../../ExpenseManager";
import { IncomeManager } from "../../IncomeManager";
import { PortfolioEditor } from "../../PortfolioEditor";
import { Section, Field } from "../../common/UIComponents";
import { num } from "../../../utils/format";
import type { SimulationInput } from "../../../logic/types";

interface AssetsSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
}

export function AssetsSection({ input, setInput }: AssetsSectionProps) {
    return (
        <>
            <Section title="💵 현재 자산">
                <div className="grid-2-cols">
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
            <IncomeManager input={input} onChange={setInput} />
            <PortfolioEditor portfolio={input.portfolio} onChange={(portfolio) => setInput({ ...input, portfolio })} />
        </>
    );
}

