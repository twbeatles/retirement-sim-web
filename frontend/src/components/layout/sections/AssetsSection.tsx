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
    const realEstate = input.realEstate ?? [];
    const additionalPensions = input.additionalPensions ?? [];
    const businessIncome = input.businessIncome ?? [];

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

            <Section title="🏘️ 부동산 자산">
                <div className="flex flex-col gap-3">
                    {realEstate.map((asset, idx) => (
                        <div key={asset.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                            <input
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                                value={asset.name}
                                onChange={(e) => {
                                    const next = [...realEstate];
                                    next[idx] = { ...next[idx], name: e.target.value };
                                    setInput({ ...input, realEstate: next });
                                }}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={asset.currentValue}
                                onChange={(e) => {
                                    const next = [...realEstate];
                                    next[idx] = { ...next[idx], currentValue: Number(e.target.value) };
                                    setInput({ ...input, realEstate: next });
                                }}
                            />
                            <button
                                className="px-3 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                onClick={() => {
                                    setInput({ ...input, realEstate: realEstate.filter((item) => item.id !== asset.id) });
                                }}
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                    <button
                        className="px-3 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-slate-200 dark:border-zinc-700 cursor-pointer"
                        onClick={() =>
                            setInput({
                                ...input,
                                realEstate: [
                                    ...realEstate,
                                    {
                                        id: Math.random().toString(36).slice(2, 9),
                                        name: `부동산 ${realEstate.length + 1}`,
                                        currentValue: 300000000,
                                        growthRate: 0.02,
                                        rentalYield: 0.03,
                                        managementCost: 0.005,
                                        type: "investment"
                                    }
                                ]
                            })
                        }
                    >
                        + 부동산 추가
                    </button>
                </div>
            </Section>

            <Section title="🧾 추가 연금">
                <div className="flex flex-col gap-3">
                    {additionalPensions.map((pension, idx) => (
                        <div key={pension.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                            <input
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                                value={pension.name}
                                onChange={(e) => {
                                    const next = [...additionalPensions];
                                    next[idx] = { ...next[idx], name: e.target.value };
                                    setInput({ ...input, additionalPensions: next });
                                }}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={pension.currentValue}
                                onChange={(e) => {
                                    const next = [...additionalPensions];
                                    next[idx] = { ...next[idx], currentValue: Number(e.target.value) };
                                    setInput({ ...input, additionalPensions: next });
                                }}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={pension.startAge}
                                onChange={(e) => {
                                    const next = [...additionalPensions];
                                    next[idx] = { ...next[idx], startAge: Number(e.target.value) };
                                    setInput({ ...input, additionalPensions: next });
                                }}
                            />
                            <button
                                className="px-3 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                onClick={() => {
                                    setInput({ ...input, additionalPensions: additionalPensions.filter((item) => item.id !== pension.id) });
                                }}
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                    <button
                        className="px-3 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-slate-200 dark:border-zinc-700 cursor-pointer"
                        onClick={() =>
                            setInput({
                                ...input,
                                additionalPensions: [
                                    ...additionalPensions,
                                    {
                                        id: Math.random().toString(36).slice(2, 9),
                                        name: `연금 ${additionalPensions.length + 1}`,
                                        type: "personal",
                                        currentValue: 10000000,
                                        monthlyContribution: 0,
                                        expectedReturn: 0.04,
                                        startAge: input.retire_age,
                                        payoutType: "lifetime"
                                    }
                                ]
                            })
                        }
                    >
                        + 추가 연금 추가
                    </button>
                </div>
            </Section>

            <Section title="💼 사업/기타 소득">
                <div className="flex flex-col gap-3">
                    {businessIncome.map((income, idx) => (
                        <div key={income.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                            <input
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                                value={income.name}
                                onChange={(e) => {
                                    const next = [...businessIncome];
                                    next[idx] = { ...next[idx], name: e.target.value };
                                    setInput({ ...input, businessIncome: next });
                                }}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={income.monthlyIncome}
                                onChange={(e) => {
                                    const next = [...businessIncome];
                                    next[idx] = { ...next[idx], monthlyIncome: Number(e.target.value) };
                                    setInput({ ...input, businessIncome: next });
                                }}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={income.startAge}
                                onChange={(e) => {
                                    const next = [...businessIncome];
                                    next[idx] = { ...next[idx], startAge: Number(e.target.value) };
                                    setInput({ ...input, businessIncome: next });
                                }}
                            />
                            <button
                                className="px-3 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                onClick={() => {
                                    setInput({ ...input, businessIncome: businessIncome.filter((item) => item.id !== income.id) });
                                }}
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                    <button
                        className="px-3 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-slate-200 dark:border-zinc-700 cursor-pointer"
                        onClick={() =>
                            setInput({
                                ...input,
                                businessIncome: [
                                    ...businessIncome,
                                    {
                                        id: Math.random().toString(36).slice(2, 9),
                                        name: `사업소득 ${businessIncome.length + 1}`,
                                        monthlyIncome: 1000000,
                                        growthRate: 0.01,
                                        startAge: input.current_age,
                                        endAge: input.retire_age
                                    }
                                ]
                            })
                        }
                    >
                        + 사업소득 추가
                    </button>
                </div>
            </Section>

            <Suspense fallback={<div className="text-center text-slate-500 dark:text-slate-400 py-8 animate-pulse font-medium">포트폴리오 모듈 로딩 중...</div>}>
                <PortfolioEditor portfolio={input.portfolio} onChange={(portfolio) => setInput({ ...input, portfolio })} />
            </Suspense>
        </>
    );
}
