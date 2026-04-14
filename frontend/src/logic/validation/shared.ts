import type { ValidationWarning } from "../types";

export function isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
}

export function pushError(warnings: ValidationWarning[], field: string, message: string) {
    warnings.push({ field, message, severity: "error" });
}

export function pushWarning(warnings: ValidationWarning[], field: string, message: string) {
    warnings.push({ field, message, severity: "warning" });
}

export function pushInfo(warnings: ValidationWarning[], field: string, message: string) {
    warnings.push({ field, message, severity: "info" });
}

export function requireFinite(
    warnings: ValidationWarning[],
    field: string,
    label: string,
    value: number
) {
    if (!isFiniteNumber(value)) {
        pushError(warnings, field, `${label}은(는) 유한한 숫자여야 합니다.`);
    }
}

export function requireNonNegative(
    warnings: ValidationWarning[],
    field: string,
    label: string,
    value: number
) {
    if (isFiniteNumber(value) && value < 0) {
        pushError(warnings, field, `${label}은(는) 0 이상이어야 합니다.`);
    }
}

export function requireRatio(
    warnings: ValidationWarning[],
    field: string,
    label: string,
    value: number | undefined
) {
    if (value === undefined) return;
    if (!isFiniteNumber(value) || value < 0 || value > 1) {
        pushError(warnings, field, `${label}은(는) 0%~100% 범위여야 합니다.`);
    }
}
