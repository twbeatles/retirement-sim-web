import { type SimulationInput, type ValidationWarning } from "./types";
import { resolveSimulationRuleSet } from "./rules/kr";
import { legacyInputToPlan, type SimulationPlanV3 } from "./plan";
import { validateLegacySimulationInput } from "./validation/legacyValidation";
import { validatePlanV3 } from "./validation/planValidationV3";

export function validateSimulationPlan(plan: SimulationPlanV3): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    validatePlanV3(warnings, plan);
    return warnings;
}

export function validateSimulationInput(input: SimulationInput): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    try {
        resolveSimulationRuleSet(input.rule_set);
    } catch (error) {
        warnings.push({
            field: "rule_set",
            message: error instanceof Error ? error.message : String(error),
            severity: "error"
        });
    }

    validateLegacySimulationInput(input, warnings);
    validatePlanV3(warnings, legacyInputToPlan(input), { validateRulebook: false });

    return warnings;
}
