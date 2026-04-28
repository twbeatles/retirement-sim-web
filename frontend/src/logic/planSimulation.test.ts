import { describe, expect, it } from "vitest";
import { INITIAL_INPUT } from "./constants";
import { legacyInputToPlan, planToLegacyInput } from "./plan";
import { legacyInputToPlanV2 } from "./planV2";
import { runSimulationPlan, runSimulationPlanV2 } from "./planSimulation";
import type { SimulationInput } from "./types";

function createRetiredPlanInput(): SimulationInput {
    const input = structuredClone(INITIAL_INPUT);
    input.current_age = 65;
    input.retire_age = 65;
    input.end_age = 66;
    input.simulation_settings.mode = "deterministic";
    input.general.current_balance = 100000000;
    input.general.monthly_contribution = 0;
    input.private_pension.current_balance = 0;
    input.private_pension.monthly_contribution = 0;
    input.private_pension.payout_years = 0;
    input.private_pension.annual_return = 0;
    input.portfolio.assetClasses = [
        { id: "cash", name: "Cash", allocation: 1, expectedAnnualReturn: 0, annualVolatility: 0 }
    ];
    input.withdrawal.strategy = "fixed_amount";
    input.withdrawal.fixedMonthlyAmount = 0;
    input.withdrawal.targetMonthlySpending = 0;
    input.withdrawal.taxRate = 0;
    input.withdrawal.taxStrategy = "detailed";
    input.health_insurance = {
        enabled: false,
        mode: "simple",
        monthlyPremium: 0,
        inflationLinked: false
    };
    input.national_pension = {
        expected_monthly_benefit_at_retirement: 5000000,
        inflation_linked: false,
        startAge: 65
    };
    return input;
}

describe("runSimulationPlanV2", () => {
    it("attaches a ledger timeline to deterministic plan simulations", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.current_age = 65;
        input.retire_age = 65;
        input.end_age = 67;
        input.simulation_settings.mode = "deterministic";
        input.withdrawal.strategy = "target_spending";
        input.withdrawal.targetMonthlySpending = 3000000;
        input.health_insurance = {
            enabled: true,
            mode: "simple",
            monthlyPremium: 200000,
            inflationLinked: false
        };

        const result = runSimulationPlanV2(legacyInputToPlanV2(input), {
            detailLevel: "full",
            includeSampleTimelines: true
        });

        expect(result.mode).toBe("deterministic");
        if (result.mode !== "deterministic") return;
        expect(result.ledgerTimeline).toBeTruthy();
        expect(result.ledgerTimeline).toHaveLength(result.timeline.length);
        expect(result.ledgerTimeline?.[0].expenses.healthInsurancePremium).toBe(200000);
        expect(result.ledgerTimeline?.[0].incomes.withdrawalGross).toBe(result.timeline[0].cashflow.withdrawalGross);
    });

    it("excludes non-taxable V3 income streams from detailed tax", () => {
        const taxablePlan = legacyInputToPlan(createRetiredPlanInput());
        const nonTaxablePlan = structuredClone(taxablePlan);
        const pensionStream = nonTaxablePlan.incomeStreams.find((stream) => stream.id === "national_pension");
        if (!pensionStream) {
            throw new Error("national pension stream should exist");
        }
        pensionStream.taxable = false;

        const taxableResult = runSimulationPlan(taxablePlan);
        const nonTaxableResult = runSimulationPlan(nonTaxablePlan);
        const taxableTimeline = "timeline" in taxableResult ? taxableResult.timeline : [];
        const nonTaxableTimeline = "timeline" in nonTaxableResult ? nonTaxableResult.timeline : [];

        expect(taxableTimeline[0].cashflow.taxPaid).toBeGreaterThan(0);
        expect(nonTaxableTimeline[0].cashflow.taxPaid).toBe(0);
        expect(nonTaxableResult.ledgerTimeline?.[0].tax.taxableIncomeMonthly).toBe(0);
    });

    it("excludes V3 healthInsuranceIncluded=false streams from detailed health insurance", () => {
        const input = createRetiredPlanInput();
        input.health_insurance = {
            enabled: true,
            mode: "detailed",
            monthlyPremium: 0,
            inflationLinked: false,
            propertyValue: 0,
            carValue: 0,
            isDependent: false
        };
        const includedPlan = legacyInputToPlan(input);
        const excludedPlan = structuredClone(includedPlan);
        const pensionStream = excludedPlan.incomeStreams.find((stream) => stream.id === "national_pension");
        if (!pensionStream) {
            throw new Error("national pension stream should exist");
        }
        pensionStream.healthInsuranceIncluded = false;

        const includedResult = runSimulationPlan(includedPlan);
        const excludedResult = runSimulationPlan(excludedPlan);
        const includedTimeline = "timeline" in includedResult ? includedResult.timeline : [];
        const excludedTimeline = "timeline" in excludedResult ? excludedResult.timeline : [];

        expect(includedTimeline[0].cashflow.healthInsurancePremium ?? 0).toBeGreaterThan(0);
        expect(excludedTimeline[0].cashflow.assessableIncomeForHealthInsurance ?? 0).toBe(0);
        expect(excludedTimeline[0].cashflow.healthInsurancePremium ?? 0)
            .toBeLessThan(includedTimeline[0].cashflow.healthInsurancePremium ?? 0);
    });

    it("uses V3 withdrawalPriority for liquid account drawdown order", () => {
        const input = createRetiredPlanInput();
        input.general.current_balance = 1000;
        input.private_pension.current_balance = 1000;
        input.withdrawal.fixedMonthlyAmount = 1000;
        input.withdrawal.taxStrategy = "simple";
        const generalFirstPlan = legacyInputToPlan(input);
        const pensionFirstPlan = structuredClone(generalFirstPlan);

        const generalAccount = pensionFirstPlan.accounts.find((account) => account.id === "general_taxable");
        const pensionAccount = pensionFirstPlan.accounts.find((account) => account.id === "private_pension_savings");
        if (!generalAccount || !pensionAccount) {
            throw new Error("liquid accounts should exist");
        }
        generalAccount.withdrawalPriority = 2;
        pensionAccount.withdrawalPriority = 1;

        const generalFirstResult = runSimulationPlan(generalFirstPlan);
        const pensionFirstResult = runSimulationPlan(pensionFirstPlan);
        const generalFirstTimeline = "timeline" in generalFirstResult ? generalFirstResult.timeline : [];
        const pensionFirstTimeline = "timeline" in pensionFirstResult ? pensionFirstResult.timeline : [];

        expect(generalFirstTimeline[0].general).toBeCloseTo(0, 6);
        expect(generalFirstTimeline[0].privatePension).toBeCloseTo(1000, 6);
        expect(pensionFirstTimeline[0].general).toBeCloseTo(1000, 6);
        expect(pensionFirstTimeline[0].privatePension).toBeCloseTo(0, 6);
    });

    it("preserves V3 core fields through the legacy UI input round trip", () => {
        const plan = legacyInputToPlan(createRetiredPlanInput());
        const generalAccount = plan.accounts.find((account) => account.id === "general_taxable");
        const pensionStream = plan.incomeStreams.find((stream) => stream.id === "national_pension");
        if (!generalAccount || !pensionStream) {
            throw new Error("plan fixtures should include account and stream");
        }
        generalAccount.withdrawalPriority = 7;
        pensionStream.taxable = false;
        pensionStream.healthInsuranceIncluded = false;

        const roundTripped = legacyInputToPlan(planToLegacyInput(plan));
        const roundTripAccount = roundTripped.accounts.find((account) => account.id === "general_taxable");
        const roundTripStream = roundTripped.incomeStreams.find((stream) => stream.id === "national_pension");

        expect(roundTripAccount?.withdrawalPriority).toBe(7);
        expect(roundTripStream?.taxable).toBe(false);
        expect(roundTripStream?.healthInsuranceIncluded).toBe(false);
    });

    it("does not double count mortgage payments as both housing and debt service in the ledger", () => {
        const input = createRetiredPlanInput();
        input.housing_status = "mortgage";
        input.general.current_balance = 100000;
        input.debt = {
            current_balance: 1200,
            annual_interest: 0,
            monthly_payment: 100
        };
        input.national_pension.expected_monthly_benefit_at_retirement = 0;
        input.withdrawal.taxStrategy = "simple";
        const plan = legacyInputToPlan(input);
        plan.expensePlan.monthlyBuckets.housing = 100;

        const result = runSimulationPlan(plan);

        expect(result.ledgerTimeline?.[0].expenses.housing).toBe(0);
        expect(result.ledgerTimeline?.[0].expenses.total).toBe(100);
        const timeline = "timeline" in result ? result.timeline : [];
        expect(timeline[0].cashflow.sources?.debtService).toBe(100);
    });
});
