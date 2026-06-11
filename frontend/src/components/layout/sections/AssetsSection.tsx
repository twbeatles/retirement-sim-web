import React, { Suspense, lazy } from "react";
import { ExpenseManager } from "../../ExpenseManager";
import { Section, Field } from "../../common/UIComponents";
import { num } from "../../../utils/format";
import type { SimulationInput, PensionType } from "../../../logic/types";
import { parseOptionalNumber } from "./assetsHelpers";

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

    const inputClassName = "px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm";
    const numberInputClassName = `${inputClassName} text-right`;

    const updateRealEstateItem = (idx: number, patch: Partial<(typeof realEstate)[number]>) => {
        const next = [...realEstate];
        next[idx] = { ...next[idx], ...patch };
        setInput({ ...input, realEstate: next });
    };

    const updateAdditionalPension = (idx: number, patch: Partial<(typeof additionalPensions)[number]>) => {
        const next = [...additionalPensions];
        next[idx] = { ...next[idx], ...patch };
        setInput({ ...input, additionalPensions: next });
    };

    const updateBusinessIncome = (idx: number, patch: Partial<(typeof businessIncome)[number]>) => {
        const next = [...businessIncome];
        next[idx] = { ...next[idx], ...patch };
        setInput({ ...input, businessIncome: next });
    };

    return (
        <>
            <Section title="현재 자산">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <Field
                        label="현재 자산(퇴직 전)"
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

            <Section title="부동산 자산">
                <div className="flex flex-col gap-3">
                    {realEstate.map((asset, idx) => (
                        <div key={asset.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                            <input
                                className={`${inputClassName} lg:col-span-2`}
                                value={asset.name}
                                onChange={(e) => updateRealEstateItem(idx, { name: e.target.value })}
                                placeholder="자산 이름"
                            />
                            <select
                                className={inputClassName}
                                value={asset.type}
                                onChange={(e) => updateRealEstateItem(idx, { type: e.target.value as "residential" | "investment" })}
                            >
                                <option value="residential">주거용</option>
                                <option value="investment">투자용</option>
                            </select>
                            <input
                                type="number"
                                className={numberInputClassName}
                                value={asset.currentValue}
                                onChange={(e) => updateRealEstateItem(idx, { currentValue: Number(e.target.value) })}
                                placeholder="현재가치(원)"
                            />
                            <input
                                type="number"
                                step="0.1"
                                className={numberInputClassName}
                                value={asset.growthRate * 100}
                                onChange={(e) => updateRealEstateItem(idx, { growthRate: Number(e.target.value) / 100 })}
                                placeholder="성장률(%)"
                            />
                            <input
                                type="number"
                                step="0.1"
                                className={numberInputClassName}
                                value={asset.rentalYield * 100}
                                onChange={(e) => updateRealEstateItem(idx, { rentalYield: Number(e.target.value) / 100 })}
                                placeholder="임대수익률(%)"
                            />
                            <input
                                type="number"
                                step="0.1"
                                className={numberInputClassName}
                                value={asset.managementCost * 100}
                                onChange={(e) => updateRealEstateItem(idx, { managementCost: Number(e.target.value) / 100 })}
                                placeholder="관리비율(%)"
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

            <Section title="추가 연금">
                <div className="flex flex-col gap-3">
                    {additionalPensions.map((pension, idx) => {
                        const isDcOrPersonal = pension.type === "dc" || pension.type === "personal";
                        const isDbOrNational = pension.type === "db" || pension.type === "national";

                        return (
                            <div key={pension.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                                <input
                                    className={`${inputClassName} lg:col-span-2`}
                                    value={pension.name}
                                    onChange={(e) => updateAdditionalPension(idx, { name: e.target.value })}
                                    placeholder="연금 이름"
                                />
                                <select
                                    className={inputClassName}
                                    value={pension.type}
                                    onChange={(e) => {
                                        const nextType = e.target.value as PensionType;
                                        updateAdditionalPension(idx, {
                                            type: nextType,
                                            expectedReturn:
                                                nextType === "dc" || nextType === "personal"
                                                    ? (pension.expectedReturn ?? 0.04)
                                                    : undefined
                                        });
                                    }}
                                >
                                    <option value="personal">개인연금</option>
                                    <option value="dc">DC</option>
                                    <option value="db">DB</option>
                                    <option value="national">국민연금</option>
                                </select>
                                <input
                                    type="number"
                                    className={numberInputClassName}
                                    value={pension.currentValue}
                                    onChange={(e) => updateAdditionalPension(idx, { currentValue: Number(e.target.value) })}
                                    placeholder="현재가치(원)"
                                />
                                <input
                                    type="number"
                                    className={numberInputClassName}
                                    value={pension.monthlyContribution}
                                    onChange={(e) => updateAdditionalPension(idx, { monthlyContribution: Number(e.target.value) })}
                                    placeholder="월 납입액(원)"
                                />
                                <input
                                    type="number"
                                    className={numberInputClassName}
                                    value={pension.startAge}
                                    onChange={(e) => updateAdditionalPension(idx, { startAge: Number(e.target.value) })}
                                    placeholder="수령 시작 나이"
                                />
                                <select
                                    className={inputClassName}
                                    value={pension.payoutType}
                                    onChange={(e) => {
                                        const nextPayoutType = e.target.value as "lifetime" | "fixed_period";
                                        updateAdditionalPension(idx, {
                                            payoutType: nextPayoutType,
                                            payoutYears: nextPayoutType === "fixed_period"
                                                ? (pension.payoutYears ?? 20)
                                                : undefined
                                        });
                                    }}
                                >
                                    <option value="lifetime">종신형</option>
                                    <option value="fixed_period">확정기간형</option>
                                </select>
                                {isDcOrPersonal && (
                                    <input
                                        type="number"
                                        step="0.1"
                                        className={numberInputClassName}
                                        value={(pension.expectedReturn ?? 0.04) * 100}
                                        onChange={(e) => updateAdditionalPension(idx, { expectedReturn: Number(e.target.value) / 100 })}
                                        placeholder="기대수익률(%)"
                                    />
                                )}
                                {pension.payoutType === "fixed_period" && (
                                    <input
                                        type="number"
                                        className={numberInputClassName}
                                        value={pension.payoutYears ?? ""}
                                        onChange={(e) => updateAdditionalPension(idx, { payoutYears: parseOptionalNumber(e.target.value) })}
                                        placeholder="수령기간(년)"
                                    />
                                )}
                                {isDbOrNational && (
                                    <input
                                        type="number"
                                        className={numberInputClassName}
                                        value={pension.monthlyPayout ?? ""}
                                        onChange={(e) => updateAdditionalPension(idx, { monthlyPayout: parseOptionalNumber(e.target.value) })}
                                        placeholder="월 수령액(원)"
                                    />
                                )}
                                <button
                                    className="px-3 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                    onClick={() => {
                                        setInput({ ...input, additionalPensions: additionalPensions.filter((item) => item.id !== pension.id) });
                                    }}
                                >
                                    삭제
                                </button>
                            </div>
                        );
                    })}
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

            <Section title="사업/기타 소득">
                <div className="flex flex-col gap-3">
                    {businessIncome.map((income, idx) => (
                        <div key={income.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                            <input
                                className={`${inputClassName} lg:col-span-2`}
                                value={income.name}
                                onChange={(e) => updateBusinessIncome(idx, { name: e.target.value })}
                                placeholder="소득 이름"
                            />
                            <input
                                type="number"
                                className={numberInputClassName}
                                value={income.monthlyIncome}
                                onChange={(e) => updateBusinessIncome(idx, { monthlyIncome: Number(e.target.value) })}
                                placeholder="월 소득(원)"
                            />
                            <input
                                type="number"
                                className={numberInputClassName}
                                value={income.growthRate * 100}
                                onChange={(e) => updateBusinessIncome(idx, { growthRate: Number(e.target.value) / 100 })}
                                placeholder="성장률(%)"
                                step="0.1"
                            />
                            <input
                                type="number"
                                className={numberInputClassName}
                                value={income.startAge}
                                onChange={(e) => updateBusinessIncome(idx, { startAge: Number(e.target.value) })}
                                placeholder="시작 나이"
                            />
                            <input
                                type="number"
                                className={numberInputClassName}
                                value={income.endAge}
                                onChange={(e) => updateBusinessIncome(idx, { endAge: Number(e.target.value) })}
                                placeholder="종료 나이"
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
