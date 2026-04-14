import { describe, expect, it } from "vitest";
import { INITIAL_INPUT } from "./constants";
import { legacyInputToPlanV2 } from "./planV2";
import { runSimulationPlanV2 } from "./planSimulation";

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
});
