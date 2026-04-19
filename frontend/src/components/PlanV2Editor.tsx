import React, { useMemo } from "react";
import {
    legacyInputToPlan,
    planToLegacyInput,
    type PlanAccount,
    type PlanIncomeStream,
    type SimulationPlanV3,
} from "../logic/plan";
import type { HousingStatus, SimulationInput } from "../logic/types";
import { formatMoney } from "../utils/format";
import { Field, Section } from "./common/UIComponents";

interface Props {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

const PLAN_STREAM_TYPES: Array<{ value: PlanIncomeStream["type"]; label: string }> = [
    { value: "salary", label: "Salary" },
    { value: "national_pension", label: "National pension" },
    { value: "business_income", label: "Business income" },
    { value: "rental_income", label: "Rental income" },
    { value: "severance", label: "Severance" },
    { value: "reverse_mortgage", label: "Reverse mortgage" },
];

const HOUSING_OPTIONS: Array<{ value: HousingStatus; label: string }> = [
    { value: "own_outright", label: "Own outright" },
    { value: "mortgage", label: "Mortgage" },
    { value: "jeonse", label: "Jeonse" },
    { value: "rent", label: "Rent" },
];

function createId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureAccount(
    plan: SimulationPlanV3,
    accountId: string,
    factory: (withdrawalPriority: number) => PlanAccount
): PlanAccount {
    let account = plan.accounts.find((item) => item.id === accountId);
    if (!account) {
        account = factory(plan.accounts.length + 1);
        plan.accounts.push(account);
    }
    return account;
}

function createTaxableAccount(withdrawalPriority: number): PlanAccount {
    return {
        id: "general_taxable",
        type: "taxable_investment",
        name: "Taxable investments",
        currency: "KRW",
        balance: 0,
        monthlyContribution: 0,
        taxTreatment: "taxable",
        healthInsuranceTreatment: "assessable",
        withdrawalPriority,
        portfolioAllocation: [],
    };
}

function createPrivatePensionAccount(withdrawalPriority: number): PlanAccount {
    return {
        id: "private_pension_savings",
        type: "pension_savings",
        name: "Private pension",
        currency: "KRW",
        balance: 0,
        monthlyContribution: 0,
        annualReturn: 0,
        taxTreatment: "tax_deferred",
        healthInsuranceTreatment: "assessable",
        withdrawalPriority,
        payout: {},
    };
}

function createDebtAccount(withdrawalPriority: number): PlanAccount {
    return {
        id: "household_debt",
        type: "debt",
        name: "Debt",
        currency: "KRW",
        balance: 0,
        taxTreatment: "non_taxable",
        healthInsuranceTreatment: "excluded",
        withdrawalPriority,
        debtTerms: {
            annualInterest: 0,
            monthlyPayment: 0,
        },
    };
}

export const PlanV2Editor = React.memo(function PlanV2Editor({
    input,
    onChange,
}: Props) {
    const plan = useMemo(() => legacyInputToPlan(input), [input]);
    const plannedMonthlySpending =
        plan.expensePlan.monthlyBuckets.essential +
        plan.expensePlan.monthlyBuckets.discretionary +
        plan.expensePlan.monthlyBuckets.housing +
        plan.expensePlan.monthlyBuckets.medical +
        plan.expensePlan.monthlyBuckets.dependentSupport;

    const taxableAccount = plan.accounts.find((account) => account.id === "general_taxable");
    const privatePensionAccount = plan.accounts.find(
        (account) => account.id === "private_pension_savings"
    );
    const debtAccount = plan.accounts.find((account) => account.id === "household_debt");

    const applyPlan = (updater: (draft: SimulationPlanV3) => void) => {
        const draft = structuredClone(plan);
        updater(draft);
        onChange(planToLegacyInput(draft));
    };

    return (
        <>
            <Section title="Plan Editor">
                <div className="mb-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    Advanced mode edits the canonical plan directly. Preview, full simulation,
                    storage, and export all use the same normalized plan structure.
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
                    <Field
                        label="Current age"
                        value={plan.profile.currentAge}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.profile.currentAge = Number(value);
                            })
                        }
                        suffix="yrs"
                    />
                    <Field
                        label="Retirement age"
                        value={plan.profile.retirementAge}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.profile.retirementAge = Number(value);
                            })
                        }
                        suffix="yrs"
                    />
                    <Field
                        label="End age"
                        value={plan.profile.endAge}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.profile.endAge = Number(value);
                            })
                        }
                        suffix="yrs"
                    />
                    <Field
                        label="Annual inflation"
                        value={plan.simulationSettings.annualInflation * 100}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.simulationSettings.annualInflation = Number(value) / 100;
                            })
                        }
                        suffix="%"
                        step="0.1"
                    />
                    <Field
                        label="Monte Carlo paths"
                        value={plan.simulationSettings.monteCarloPaths}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.simulationSettings.monteCarloPaths = Math.max(
                                    1,
                                    Math.floor(Number(value))
                                );
                            })
                        }
                        suffix="paths"
                    />
                    <div className="mb-3 flex w-full min-w-0 flex-col gap-1.5">
                        <label className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Housing status
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            value={plan.profile.housingStatus}
                            onChange={(event) =>
                                applyPlan((draft) => {
                                    draft.profile.housingStatus =
                                        event.target.value as HousingStatus;
                                })
                            }
                        >
                            {HOUSING_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/50">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Monthly spending target
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatMoney(plannedMonthlySpending)}
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Essential, discretionary, housing, medical, and dependent-support buckets
                        are summed into the displayed spending target.
                    </div>
                </div>
            </Section>

            <Section title="Plan Accounts">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                            Taxable investments
                        </div>
                        <Field
                            label="Current balance"
                            value={Math.round((taxableAccount?.balance ?? 0) / 10000)}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "general_taxable",
                                        createTaxableAccount
                                    );
                                    account.balance = Number(value) * 10000;
                                })
                            }
                            suffix="10k KRW"
                        />
                        <Field
                            label="Monthly contribution"
                            value={Math.round((taxableAccount?.monthlyContribution ?? 0) / 10000)}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "general_taxable",
                                        createTaxableAccount
                                    );
                                    account.monthlyContribution = Number(value) * 10000;
                                })
                            }
                            suffix="10k KRW"
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                            Private pension / IRP
                        </div>
                        <Field
                            label="Current balance"
                            value={Math.round((privatePensionAccount?.balance ?? 0) / 10000)}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "private_pension_savings",
                                        createPrivatePensionAccount
                                    );
                                    account.balance = Number(value) * 10000;
                                })
                            }
                            suffix="10k KRW"
                        />
                        <Field
                            label="Monthly contribution"
                            value={Math.round(
                                (privatePensionAccount?.monthlyContribution ?? 0) / 10000
                            )}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "private_pension_savings",
                                        createPrivatePensionAccount
                                    );
                                    account.monthlyContribution = Number(value) * 10000;
                                })
                            }
                            suffix="10k KRW"
                        />
                        <Field
                            label="Annual return"
                            value={(privatePensionAccount?.annualReturn ?? 0) * 100}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "private_pension_savings",
                                        createPrivatePensionAccount
                                    );
                                    account.annualReturn = Number(value) / 100;
                                })
                            }
                            suffix="%"
                            step="0.1"
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                            Debt
                        </div>
                        <Field
                            label="Balance"
                            value={Math.round((debtAccount?.balance ?? 0) / 10000)}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "household_debt",
                                        createDebtAccount
                                    );
                                    account.balance = Number(value) * 10000;
                                })
                            }
                            suffix="10k KRW"
                        />
                        <Field
                            label="Monthly payment"
                            value={Math.round((debtAccount?.debtTerms?.monthlyPayment ?? 0) / 10000)}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "household_debt",
                                        createDebtAccount
                                    );
                                    account.debtTerms = {
                                        annualInterest: account.debtTerms?.annualInterest ?? 0,
                                        monthlyPayment: Number(value) * 10000,
                                    };
                                })
                            }
                            suffix="10k KRW"
                        />
                        <Field
                            label="Interest rate"
                            value={(debtAccount?.debtTerms?.annualInterest ?? 0) * 100}
                            onChange={(value) =>
                                applyPlan((draft) => {
                                    const account = ensureAccount(
                                        draft,
                                        "household_debt",
                                        createDebtAccount
                                    );
                                    account.debtTerms = {
                                        annualInterest: Number(value) / 100,
                                        monthlyPayment: account.debtTerms?.monthlyPayment ?? 0,
                                    };
                                })
                            }
                            suffix="%"
                            step="0.1"
                        />
                    </div>
                </div>
            </Section>

            <Section title="Income Streams">
                <div className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    These streams feed the canonical source map used by tax, health insurance, the
                    monthly ledger, and reports.
                </div>

                <div className="flex flex-col gap-3">
                    {plan.incomeStreams.map((stream) => (
                        <div
                            key={stream.id}
                            className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-6 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                            <select
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.type}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.type = event.target.value as PlanIncomeStream["type"];
                                    })
                                }
                            >
                                {PLAN_STREAM_TYPES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.name}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.name = event.target.value;
                                    })
                                }
                                placeholder="Stream name"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.monthlyAmount}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.monthlyAmount = Number(event.target.value);
                                    })
                                }
                                placeholder="Monthly amount"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.startAge}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.startAge = Number(event.target.value);
                                    })
                                }
                                placeholder="Start age"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={stream.endAge ?? ""}
                                onChange={(event) =>
                                    applyPlan((draft) => {
                                        const target = draft.incomeStreams.find(
                                            (item) => item.id === stream.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.endAge =
                                            event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value);
                                    })
                                }
                                placeholder="End age"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={stream.taxable}
                                        onChange={(event) =>
                                            applyPlan((draft) => {
                                                const target = draft.incomeStreams.find(
                                                    (item) => item.id === stream.id
                                                );
                                                if (!target) {
                                                    return;
                                                }
                                                target.taxable = event.target.checked;
                                            })
                                        }
                                    />
                                    Taxable
                                </label>
                                <button
                                    type="button"
                                    className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() =>
                                        applyPlan((draft) => {
                                            draft.incomeStreams = draft.incomeStreams.filter(
                                                (item) => item.id !== stream.id
                                            );
                                        })
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="mt-4 cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    onClick={() =>
                        applyPlan((draft) => {
                            draft.incomeStreams.push({
                                id: createId("income"),
                                type: "business_income",
                                name: `Income ${draft.incomeStreams.length + 1}`,
                                monthlyAmount: 1000000,
                                startAge: draft.profile.currentAge,
                                endAge: draft.profile.retirementAge,
                                annualGrowthRate: 0,
                                inflationLinked: false,
                                taxable: true,
                                healthInsuranceIncluded: true,
                            });
                        })
                    }
                >
                    + Add income stream
                </button>
            </Section>

            <Section title="Expense Plan">
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
                    <Field
                        label="Essential"
                        value={Math.round(plan.expensePlan.monthlyBuckets.essential / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.essential = Number(value) * 10000;
                            })
                        }
                        suffix="10k KRW"
                    />
                    <Field
                        label="Discretionary"
                        value={Math.round(plan.expensePlan.monthlyBuckets.discretionary / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.discretionary =
                                    Number(value) * 10000;
                            })
                        }
                        suffix="10k KRW"
                    />
                    <Field
                        label="Housing"
                        value={Math.round(plan.expensePlan.monthlyBuckets.housing / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.housing = Number(value) * 10000;
                            })
                        }
                        suffix="10k KRW"
                    />
                    <Field
                        label="Medical"
                        value={Math.round(plan.expensePlan.monthlyBuckets.medical / 10000)}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.medical = Number(value) * 10000;
                            })
                        }
                        suffix="10k KRW"
                    />
                    <Field
                        label="Dependent support"
                        value={Math.round(
                            plan.expensePlan.monthlyBuckets.dependentSupport / 10000
                        )}
                        onChange={(value) =>
                            applyPlan((draft) => {
                                draft.expensePlan.monthlyBuckets.dependentSupport =
                                    Number(value) * 10000;
                            })
                        }
                        suffix="10k KRW"
                    />
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/50">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total monthly plan
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatMoney(plannedMonthlySpending)}
                    </div>
                </div>
            </Section>

            <Section title="One-off Events">
                <div className="flex flex-col gap-3">
                    {plan.expensePlan.oneOffEvents.map((event) => (
                        <div
                            key={event.id}
                            className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-3 sm:grid-cols-4 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                            <input
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={event.name}
                                onChange={(changeEvent) =>
                                    applyPlan((draft) => {
                                        const target = draft.expensePlan.oneOffEvents.find(
                                            (item) => item.id === event.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.name = changeEvent.target.value;
                                    })
                                }
                                placeholder="Event name"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={event.monthIndex}
                                onChange={(changeEvent) =>
                                    applyPlan((draft) => {
                                        const target = draft.expensePlan.oneOffEvents.find(
                                            (item) => item.id === event.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.monthIndex = Number(changeEvent.target.value);
                                    })
                                }
                                placeholder="Month index"
                            />
                            <input
                                type="number"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                value={event.amount}
                                onChange={(changeEvent) =>
                                    applyPlan((draft) => {
                                        const target = draft.expensePlan.oneOffEvents.find(
                                            (item) => item.id === event.id
                                        );
                                        if (!target) {
                                            return;
                                        }
                                        target.amount = Number(changeEvent.target.value);
                                    })
                                }
                                placeholder="Amount"
                            />
                            <button
                                type="button"
                                className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() =>
                                    applyPlan((draft) => {
                                        draft.expensePlan.oneOffEvents =
                                            draft.expensePlan.oneOffEvents.filter(
                                                (item) => item.id !== event.id
                                            );
                                    })
                                }
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="mt-4 cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    onClick={() =>
                        applyPlan((draft) => {
                            draft.expensePlan.oneOffEvents.push({
                                id: createId("event"),
                                name: `Event ${draft.expensePlan.oneOffEvents.length + 1}`,
                                monthIndex: 12,
                                amount: -5000000,
                            });
                        })
                    }
                >
                    + Add one-off event
                </button>
            </Section>
        </>
    );
});

export const PlanEditor = PlanV2Editor;
