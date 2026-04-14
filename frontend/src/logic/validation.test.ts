import { describe, expect, it } from "vitest";
import { INITIAL_INPUT } from "./constants";
import { legacyInputToPlanV2 } from "./planV2";
import { validateSimulationInput } from "./validation";

describe("validateSimulationInput", () => {
    it("rejects non-finite and negative numeric inputs", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.general.current_balance = Number.NaN;
        input.general.monthly_contribution = -1;

        const warnings = validateSimulationInput(input);

        expect(warnings.some((warning) => warning.field === "general.current_balance" && warning.severity === "error")).toBe(true);
        expect(warnings.some((warning) => warning.field === "general.monthly_contribution" && warning.severity === "error")).toBe(true);
    });

    it("rejects historical start years outside the bundled snapshot range", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.simulation_settings.mode = "historical";
        input.simulation_settings.historical_start_year = 1970;

        const warnings = validateSimulationInput(input);

        expect(
            warnings.some(
                (warning) =>
                    warning.field === "simulation_settings" &&
                    warning.severity === "error" &&
                    warning.message.includes("1985~2024")
            )
        ).toBe(true);
    });

    it("requires target spending for target spending withdrawals", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.withdrawal.strategy = "target_spending";
        delete input.withdrawal.targetMonthlySpending;

        const warnings = validateSimulationInput(input);

        expect(
            warnings.some(
                (warning) =>
                    warning.field === "withdrawal.targetMonthlySpending" &&
                    warning.severity === "error"
            )
        ).toBe(true);
    });

    it("flags inconsistent housing status versus residential property inputs", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.housing_status = "rent";
        input.realEstate = [
            {
                id: "home",
                name: "자가주택",
                currentValue: 700000000,
                growthRate: 0.02,
                rentalYield: 0,
                managementCost: 0.005,
                type: "residential"
            }
        ];

        const warnings = validateSimulationInput(input);

        expect(
            warnings.some(
                (warning) =>
                    warning.field === "housing_status" &&
                    warning.severity === "info"
            )
        ).toBe(true);
    });

    it("validates plan_v2 specific expense and income fields", () => {
        const input = structuredClone(INITIAL_INPUT);
        input.plan_v2 = legacyInputToPlanV2(input);
        input.plan_v2.expensePlan.discretionaryMonthly = Number.POSITIVE_INFINITY;
        input.plan_v2.incomeStreams.push({
            id: "manual_rental",
            type: "rental_income",
            name: "임대소득",
            monthlyAmount: -1000,
            startAge: input.current_age,
            taxable: true,
            healthInsuranceIncluded: true
        });

        const warnings = validateSimulationInput(input);

        expect(
            warnings.some(
                (warning) =>
                    warning.field === "plan_v2.expensePlan.discretionaryMonthly" &&
                    warning.severity === "error"
            )
        ).toBe(true);
        expect(
            warnings.some(
                (warning) =>
                    warning.field.includes("plan_v2.incomeStreams") &&
                    warning.field.endsWith("monthlyAmount") &&
                    warning.severity === "error"
            )
        ).toBe(true);
    });
});
