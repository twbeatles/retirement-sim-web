import type { PlanAccount, SimulationPlanV3 } from "../../logic/plan";

export function createId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureAccount(
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

export function createTaxableAccount(withdrawalPriority: number): PlanAccount {
    return {
        id: "general_taxable",
        type: "taxable_investment",
        name: "과세 투자자산",
        currency: "KRW",
        balance: 0,
        monthlyContribution: 0,
        taxTreatment: "taxable",
        healthInsuranceTreatment: "assessable",
        withdrawalPriority,
        portfolioAllocation: [],
    };
}

export function createPrivatePensionAccount(withdrawalPriority: number): PlanAccount {
    return {
        id: "private_pension_savings",
        type: "pension_savings",
        name: "개인연금",
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

export function createDebtAccount(withdrawalPriority: number): PlanAccount {
    return {
        id: "household_debt",
        type: "debt",
        name: "부채",
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
