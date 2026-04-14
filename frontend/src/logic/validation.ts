import { type SimulationInput, type ValidationWarning } from "./types";
import { validateLegacySimulationInput } from "./validation/legacyValidation";
import { validatePlanV2 } from "./validation/planValidation";

export function validateSimulationInput(input: SimulationInput): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    validateLegacySimulationInput(input, warnings);

    if (input.plan_v2) {
        validatePlanV2(warnings, input, input.plan_v2);
    }

    return warnings;
}
