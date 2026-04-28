import type { PlanAccount } from "../../logic/plan";
import { Field, Section } from "../common/UIComponents";
import {
    createDebtAccount,
    createPrivatePensionAccount,
    createTaxableAccount,
    ensureAccount,
} from "./accountFactories";
import type { ApplyPlan } from "./types";

type Props = {
    taxableAccount?: PlanAccount;
    privatePensionAccount?: PlanAccount;
    debtAccount?: PlanAccount;
    applyPlan: ApplyPlan;
};

export function PlanAccountsSection({ taxableAccount, privatePensionAccount, debtAccount, applyPlan }: Props) {
    return (
        <Section title="플랜 계정">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                            과세 투자자산
                        </div>
                        <Field
                            label="현재 잔액"
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
                            suffix="만원"
                        />
                        <Field
                            label="월 납입액"
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
                            suffix="만원"
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <div className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                            개인연금 / IRP
                        </div>
                        <Field
                            label="현재 잔액"
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
                            suffix="만원"
                        />
                        <Field
                            label="월 납입액"
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
                            suffix="만원"
                        />
                        <Field
                            label="연 수익률"
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
                            부채
                        </div>
                        <Field
                            label="잔액"
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
                            suffix="만원"
                        />
                        <Field
                            label="월 상환액"
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
                            suffix="만원"
                        />
                        <Field
                            label="이자율"
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
    );
}
