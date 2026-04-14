import { describe, expect, it } from "vitest";
import { INITIAL_INPUT } from "./constants";
import { legacyInputToPlanV2, planV2ToLegacyInput } from "./planV2";

describe("plan v2 adapters", () => {
    it("serializes legacy input into the plan-centered v2 shape", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.housing_status = "mortgage";
        input.businessIncome = [
            {
                id: "consulting",
                name: "자문",
                monthlyIncome: 1200000,
                growthRate: 0.01,
                startAge: 61,
                endAge: 70
            }
        ];
        input.realEstate = [
            {
                id: "house",
                name: "실거주",
                currentValue: 700000000,
                growthRate: 0.02,
                rentalYield: 0,
                managementCost: 0.004,
                type: "residential"
            }
        ];

        const plan = legacyInputToPlanV2(input);

        expect(plan.planVersion).toBe("v2");
        expect(plan.profile.currentAge).toBe(input.current_age);
        expect(plan.accounts.some((account) => account.type === "taxable_investment")).toBe(true);
        expect(plan.accounts.some((account) => account.type === "residence")).toBe(true);
        expect(plan.incomeStreams.some((stream) => stream.type === "business_income")).toBe(true);
        expect(plan.withdrawalPolicy.strategy.strategy).toBe(input.withdrawal.strategy);
    });

    it("round-trips key retirement data between legacy input and plan v2", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.current_age = 42;
        input.retire_age = 58;
        input.end_age = 92;
        input.housing_status = "rent";
        input.general.current_balance = 180000000;
        input.general.monthly_contribution = 2200000;
        input.private_pension.current_balance = 50000000;
        input.national_pension.expected_monthly_benefit_at_retirement = 1700000;
        input.withdrawal.strategy = "target_spending";
        input.withdrawal.targetMonthlySpending = 4200000;
        input.events = [{ month_index: 24, amount: -5000000, name: "차량" }];
        input.health_insurance = {
            enabled: true,
            mode: "detailed",
            monthlyPremium: 0,
            inflationLinked: false,
            propertyValue: 250000000,
            carValue: 0,
            isDependent: false
        };

        const restored = planV2ToLegacyInput(legacyInputToPlanV2(input));

        expect(restored.current_age).toBe(input.current_age);
        expect(restored.retire_age).toBe(input.retire_age);
        expect(restored.end_age).toBe(input.end_age);
        expect(restored.housing_status).toBe("rent");
        expect(restored.general.current_balance).toBe(input.general.current_balance);
        expect(restored.general.monthly_contribution).toBe(input.general.monthly_contribution);
        expect(restored.private_pension.current_balance).toBe(input.private_pension.current_balance);
        expect(restored.national_pension.expected_monthly_benefit_at_retirement).toBe(input.national_pension.expected_monthly_benefit_at_retirement);
        expect(restored.withdrawal.strategy).toBe("target_spending");
        expect(restored.withdrawal.targetMonthlySpending).toBe(input.withdrawal.targetMonthlySpending);
        expect(restored.events).toEqual(input.events);
        expect(restored.health_insurance).toEqual(input.health_insurance);
    });

    it("preserves plan-only expense buckets via plan_v2 snapshot and maps them into target spending", () => {
        const plan = legacyInputToPlanV2(structuredClone(INITIAL_INPUT));
        plan.expensePlan.essentialMonthly = 2500000;
        plan.expensePlan.discretionaryMonthly = 900000;
        plan.expensePlan.housingMonthly = 600000;
        plan.expensePlan.medicalBaselineMonthly = 200000;
        plan.expensePlan.stageAdjustments.push({
            id: "medical_late_life",
            name: "후기 의료비",
            amount: 500000,
            startAge: 80,
            endAge: 90,
            isRecurring: true,
            intervalYears: 1
        });

        const restoredInput = planV2ToLegacyInput(plan);
        const restoredPlan = legacyInputToPlanV2(restoredInput);

        expect(restoredInput.withdrawal.targetMonthlySpending).toBe(4200000);
        expect(restoredInput.events.some((event) => (event.name ?? "").includes("medical_late_life"))).toBe(true);
        expect(restoredPlan.expensePlan.discretionaryMonthly).toBe(900000);
        expect(restoredPlan.expensePlan.housingMonthly).toBe(600000);
        expect(restoredPlan.expensePlan.medicalBaselineMonthly).toBe(200000);
    });
});
