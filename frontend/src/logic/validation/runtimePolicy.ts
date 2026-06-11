import { MAX_PLAN_COLLECTION_ITEMS } from "../runtimeLimits";
import type { ValidationWarning } from "../types";
import { pushError } from "./shared";

export const VALID_SIMULATION_MODES = new Set(["deterministic", "montecarlo", "historical"]);

export function requireCollectionLimit(
    warnings: ValidationWarning[],
    field: string,
    label: string,
    value: unknown[] | undefined
) {
    if (value && value.length > MAX_PLAN_COLLECTION_ITEMS) {
        pushError(
            warnings,
            field,
            `${label} 항목 수는 ${MAX_PLAN_COLLECTION_ITEMS}개 이하여야 합니다.`
        );
    }
}
