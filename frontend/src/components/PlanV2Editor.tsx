import React, { useMemo } from "react";
import { legacyInputToPlanV2, planV2ToLegacyInput, type PlanAccount, type PlanIncomeStreamType, type SimulationPlanV2 } from "../logic/planV2";
import type { HousingStatus, SimulationInput } from "../logic/types";
import { formatMoney } from "../utils/format";
import { Field, Section } from "./common/UIComponents";

interface Props {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

const PLAN_STREAM_TYPES: Array<{ value: PlanIncomeStreamType; label: string }> = [
    { value: "salary", label: "급여" },
    { value: "national_pension", label: "국민연금" },
    { value: "business_income", label: "사업소득" },
    { value: "rental_income", label: "임대소득" },
    { value: "severance", label: "퇴직금 연금" },
    { value: "reverse_mortgage", label: "주택연금" }
];

const HOUSING_OPTIONS: Array<{ value: HousingStatus; label: string }> = [
    { value: "own_outright", label: "무주담 주택" },
    { value: "mortgage", label: "주담대 보유" },
    { value: "jeonse", label: "전세" },
    { value: "rent", label: "월세" }
];

function createId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureAccount(
    plan: SimulationPlanV2,
    accountId: string,
    factory: () => PlanAccount
) {
    let account = plan.accounts.find((item) => item.id === accountId);
    if (!account) {
        account = factory();
        plan.accounts.push(account);
    }
    return account;
}

export const PlanV2Editor = React.memo(function PlanV2Editor({ input, onChange }: Props) {
    const plan = useMemo(() => legacyInputToPlanV2(input), [input]);
    const plannedMonthlySpending = plan.expensePlan.essentialMonthly
        + plan.expensePlan.discretionaryMonthly
        + plan.expensePlan.housingMonthly
        + plan.expensePlan.medicalBaselineMonthly;

    const taxableAccount = plan.accounts.find((account) => account.id === "general_taxable");
    const privatePensionAccount = plan.accounts.find((account) => account.id === "private_pension_savings");
    const debtAccount = plan.accounts.find((account) => account.id === "household_debt");

    const applyPlan = (updater: (draft: SimulationPlanV2) => void) => {
        const draft = structuredClone(plan);
        updater(draft);
        onChange(planV2ToLegacyInput(draft));
    };

    return (
        <>
            <Section title="🧭 Plan V2 Editor">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    프로 모드에서는 아래 편집기가 `profile`, `accounts`, `incomeStreams`, `expensePlan`, `withdrawalPolicy`를 직접 수정합니다.
                    월 필수/선택/주거/의료 지출의 합계는 은퇴 목표 생활비로 연결됩니다.
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2">
                    <Field
                        label="현재 나이"
                        value={plan.profile.currentAge}
                        onChange={(v) => applyPlan((draft) => { draft.profile.currentAge = Number(v); })}
                        suffix="세"
                    />
                    <Field
                        label="은퇴 나이"
                        value={plan.profile.retirementAge}
                        onChange={(v) => applyPlan((draft) => { draft.profile.retirementAge = Number(v); })}
                        suffix="세"
                    />
                    <Field
                        label="종료 나이"
                        value={plan.profile.endAge}
                        onChange={(v) => applyPlan((draft) => { draft.profile.endAge = Number(v); })}
                        suffix="세"
                    />
                    <Field
                        label="연간 물가상승률"
                        value={plan.simulationSettings.annualInflation * 100}
                        onChange={(v) => applyPlan((draft) => { draft.simulationSettings.annualInflation = Number(v) / 100; })}
                        suffix="%"
                        step="0.1"
                    />
                    <Field
                        label="몬테카를로 횟수"
                        value={plan.simulationSettings.monteCarloPaths}
                        onChange={(v) => applyPlan((draft) => { draft.simulationSettings.monteCarloPaths = Math.max(1, Math.floor(Number(v))); })}
                        suffix="회"
                    />
                    <div className="flex flex-col gap-1.5 mb-3 w-full min-w-0">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">주거 상태</label>
                        <select
                            className="w-full py-2 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white"
                            value={plan.profile.housingStatus}
                            onChange={(event) => applyPlan((draft) => { draft.profile.housingStatus = event.target.value as HousingStatus; })}
                        >
                            {HOUSING_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-slate-50/70 dark:bg-zinc-800/50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">연결된 은퇴 목표 생활비</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(plannedMonthlySpending)}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                        필수생활비 + 선택지출 + 주거비 + 기본의료비의 합계가 계산 엔진의 목표 생활비로 전달됩니다.
                    </div>
                </div>
            </Section>

            <Section title="💼 Plan Accounts">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 p-4 bg-slate-50/70 dark:bg-zinc-800/50">
                        <div className="text-sm font-bold text-slate-800 dark:text-white mb-3">과세 금융자산</div>
                        <Field
                            label="현재 잔고"
                            value={Math.round((taxableAccount?.balance ?? 0) / 10000)}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "general_taxable", () => ({
                                    id: "general_taxable",
                                    type: "taxable_investment",
                                    name: "일반 금융자산",
                                    currency: "KRW",
                                    balance: 0,
                                    monthlyContribution: 0,
                                    portfolioAllocation: []
                                }));
                                account.balance = Number(v) * 10000;
                            })}
                            suffix="만원"
                        />
                        <Field
                            label="월 납입액"
                            value={Math.round((taxableAccount?.monthlyContribution ?? 0) / 10000)}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "general_taxable", () => ({
                                    id: "general_taxable",
                                    type: "taxable_investment",
                                    name: "일반 금융자산",
                                    currency: "KRW",
                                    balance: 0,
                                    monthlyContribution: 0,
                                    portfolioAllocation: []
                                }));
                                account.monthlyContribution = Number(v) * 10000;
                            })}
                            suffix="만원"
                        />
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 p-4 bg-slate-50/70 dark:bg-zinc-800/50">
                        <div className="text-sm font-bold text-slate-800 dark:text-white mb-3">개인연금/IRP</div>
                        <Field
                            label="현재 잔고"
                            value={Math.round((privatePensionAccount?.balance ?? 0) / 10000)}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "private_pension_savings", () => ({
                                    id: "private_pension_savings",
                                    type: "pension_savings",
                                    name: "개인연금",
                                    currency: "KRW",
                                    balance: 0,
                                    monthlyContribution: 0,
                                    annualReturn: 0,
                                    payout: {}
                                }));
                                account.balance = Number(v) * 10000;
                            })}
                            suffix="만원"
                        />
                        <Field
                            label="월 납입액"
                            value={Math.round((privatePensionAccount?.monthlyContribution ?? 0) / 10000)}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "private_pension_savings", () => ({
                                    id: "private_pension_savings",
                                    type: "pension_savings",
                                    name: "개인연금",
                                    currency: "KRW",
                                    balance: 0,
                                    monthlyContribution: 0,
                                    annualReturn: 0,
                                    payout: {}
                                }));
                                account.monthlyContribution = Number(v) * 10000;
                            })}
                            suffix="만원"
                        />
                        <Field
                            label="예상 수익률"
                            value={(privatePensionAccount?.annualReturn ?? 0) * 100}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "private_pension_savings", () => ({
                                    id: "private_pension_savings",
                                    type: "pension_savings",
                                    name: "개인연금",
                                    currency: "KRW",
                                    balance: 0,
                                    monthlyContribution: 0,
                                    annualReturn: 0,
                                    payout: {}
                                }));
                                account.annualReturn = Number(v) / 100;
                            })}
                            suffix="%"
                            step="0.1"
                        />
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 p-4 bg-slate-50/70 dark:bg-zinc-800/50">
                        <div className="text-sm font-bold text-slate-800 dark:text-white mb-3">부채</div>
                        <Field
                            label="잔액"
                            value={Math.round((debtAccount?.balance ?? 0) / 10000)}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "household_debt", () => ({
                                    id: "household_debt",
                                    type: "debt",
                                    name: "부채",
                                    currency: "KRW",
                                    balance: 0,
                                    debtTerms: {
                                        annualInterest: 0,
                                        monthlyPayment: 0
                                    }
                                }));
                                account.balance = Number(v) * 10000;
                            })}
                            suffix="만원"
                        />
                        <Field
                            label="월 상환액"
                            value={Math.round((debtAccount?.debtTerms?.monthlyPayment ?? 0) / 10000)}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "household_debt", () => ({
                                    id: "household_debt",
                                    type: "debt",
                                    name: "부채",
                                    currency: "KRW",
                                    balance: 0,
                                    debtTerms: {
                                        annualInterest: 0,
                                        monthlyPayment: 0
                                    }
                                }));
                                account.debtTerms = {
                                    annualInterest: account.debtTerms?.annualInterest ?? 0,
                                    monthlyPayment: Number(v) * 10000
                                };
                            })}
                            suffix="만원"
                        />
                        <Field
                            label="연이율"
                            value={(debtAccount?.debtTerms?.annualInterest ?? 0) * 100}
                            onChange={(v) => applyPlan((draft) => {
                                const account = ensureAccount(draft, "household_debt", () => ({
                                    id: "household_debt",
                                    type: "debt",
                                    name: "부채",
                                    currency: "KRW",
                                    balance: 0,
                                    debtTerms: {
                                        annualInterest: 0,
                                        monthlyPayment: 0
                                    }
                                }));
                                account.debtTerms = {
                                    annualInterest: Number(v) / 100,
                                    monthlyPayment: account.debtTerms?.monthlyPayment ?? 0
                                };
                            })}
                            suffix="%"
                            step="0.1"
                        />
                    </div>
                </div>
            </Section>

            <Section title="💸 Income Streams">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                    현재 계산 엔진과 직접 연결된 흐름: 급여, 국민연금, 사업/임대소득, 퇴직금 연금, 주택연금
                </div>
                <div className="flex flex-col gap-3">
                    {plan.incomeStreams.map((stream) => (
                        <div key={stream.id} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2 p-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-slate-50/60 dark:bg-zinc-800/40">
                            <select
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-medium"
                                value={stream.type}
                                onChange={(event) => applyPlan((draft) => {
                                    const target = draft.incomeStreams.find((item) => item.id === stream.id);
                                    if (!target) return;
                                    target.type = event.target.value as PlanIncomeStreamType;
                                })}
                            >
                                {PLAN_STREAM_TYPES.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <input
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                                value={stream.name}
                                onChange={(event) => applyPlan((draft) => {
                                    const target = draft.incomeStreams.find((item) => item.id === stream.id);
                                    if (!target) return;
                                    target.name = event.target.value;
                                })}
                                placeholder="소득 이름"
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={stream.monthlyAmount}
                                onChange={(event) => applyPlan((draft) => {
                                    const target = draft.incomeStreams.find((item) => item.id === stream.id);
                                    if (!target) return;
                                    target.monthlyAmount = Number(event.target.value);
                                })}
                                placeholder="월 금액"
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={stream.startAge}
                                onChange={(event) => applyPlan((draft) => {
                                    const target = draft.incomeStreams.find((item) => item.id === stream.id);
                                    if (!target) return;
                                    target.startAge = Number(event.target.value);
                                })}
                                placeholder="시작 나이"
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={stream.endAge ?? ""}
                                onChange={(event) => applyPlan((draft) => {
                                    const target = draft.incomeStreams.find((item) => item.id === stream.id);
                                    if (!target) return;
                                    target.endAge = event.target.value === "" ? undefined : Number(event.target.value);
                                })}
                                placeholder="종료 나이"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={stream.taxable}
                                        onChange={(event) => applyPlan((draft) => {
                                            const target = draft.incomeStreams.find((item) => item.id === stream.id);
                                            if (!target) return;
                                            target.taxable = event.target.checked;
                                        })}
                                    />
                                    과세
                                </label>
                                <button
                                    type="button"
                                    className="px-3 py-2 text-xs font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                    onClick={() => applyPlan((draft) => {
                                        draft.incomeStreams = draft.incomeStreams.filter((item) => item.id !== stream.id);
                                    })}
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-sm font-bold cursor-pointer"
                    onClick={() => applyPlan((draft) => {
                        draft.incomeStreams.push({
                            id: createId("income"),
                            type: "business_income",
                            name: `소득 ${draft.incomeStreams.length + 1}`,
                            monthlyAmount: 1000000,
                            startAge: draft.profile.currentAge,
                            endAge: draft.profile.retirementAge,
                            annualGrowthRate: 0,
                            taxable: true,
                            healthInsuranceIncluded: true
                        });
                    })}
                >
                    + 소득 흐름 추가
                </button>
            </Section>

            <Section title="🧾 Expense Plan">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2">
                    <Field
                        label="월 필수생활비"
                        value={Math.round(plan.expensePlan.essentialMonthly / 10000)}
                        onChange={(v) => applyPlan((draft) => { draft.expensePlan.essentialMonthly = Number(v) * 10000; })}
                        suffix="만원"
                    />
                    <Field
                        label="월 선택지출"
                        value={Math.round(plan.expensePlan.discretionaryMonthly / 10000)}
                        onChange={(v) => applyPlan((draft) => { draft.expensePlan.discretionaryMonthly = Number(v) * 10000; })}
                        suffix="만원"
                    />
                    <Field
                        label="월 주거비"
                        value={Math.round(plan.expensePlan.housingMonthly / 10000)}
                        onChange={(v) => applyPlan((draft) => { draft.expensePlan.housingMonthly = Number(v) * 10000; })}
                        suffix="만원"
                    />
                    <Field
                        label="월 기본 의료비"
                        value={Math.round(plan.expensePlan.medicalBaselineMonthly / 10000)}
                        onChange={(v) => applyPlan((draft) => { draft.expensePlan.medicalBaselineMonthly = Number(v) * 10000; })}
                        suffix="만원"
                    />
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-slate-50/70 dark:bg-zinc-800/50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">총 월지출 계획</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(plannedMonthlySpending)}</div>
                </div>
            </Section>

            <Section title="📆 One-off Events">
                <div className="flex flex-col gap-3">
                    {plan.expensePlan.oneOffEvents.map((event) => (
                        <div key={event.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-slate-50/60 dark:bg-zinc-800/40">
                            <input
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                                value={event.name}
                                onChange={(evt) => applyPlan((draft) => {
                                    const target = draft.expensePlan.oneOffEvents.find((item) => item.id === event.id);
                                    if (!target) return;
                                    target.name = evt.target.value;
                                })}
                                placeholder="이벤트 이름"
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={event.monthIndex}
                                onChange={(evt) => applyPlan((draft) => {
                                    const target = draft.expensePlan.oneOffEvents.find((item) => item.id === event.id);
                                    if (!target) return;
                                    target.monthIndex = Number(evt.target.value);
                                })}
                                placeholder="월 인덱스"
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right"
                                value={event.amount}
                                onChange={(evt) => applyPlan((draft) => {
                                    const target = draft.expensePlan.oneOffEvents.find((item) => item.id === event.id);
                                    if (!target) return;
                                    target.amount = Number(evt.target.value);
                                })}
                                placeholder="금액"
                            />
                            <button
                                type="button"
                                className="px-3 py-2 text-xs font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                onClick={() => applyPlan((draft) => {
                                    draft.expensePlan.oneOffEvents = draft.expensePlan.oneOffEvents.filter((item) => item.id !== event.id);
                                })}
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-sm font-bold cursor-pointer"
                    onClick={() => applyPlan((draft) => {
                        draft.expensePlan.oneOffEvents.push({
                            id: createId("event"),
                            name: `이벤트 ${draft.expensePlan.oneOffEvents.length + 1}`,
                            monthIndex: 12,
                            amount: -5000000
                        });
                    })}
                >
                    + 이벤트 추가
                </button>
            </Section>
        </>
    );
});
