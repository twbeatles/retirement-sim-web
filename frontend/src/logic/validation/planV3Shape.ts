import type { SimulationPlanV3 } from "../plan";
import { MAX_PLAN_COLLECTION_ITEMS } from "../runtimeLimits";
import type { ValidationWarning } from "../types";
import { pushError } from "./shared";

export function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(
    warnings: ValidationWarning[],
    field: string,
    label: string,
    value: unknown
): boolean {
    if (!isRecord(value)) {
        pushError(warnings, field, `${label} 구조가 유효하지 않습니다.`);
        return false;
    }
    return true;
}

function requireArray(
    warnings: ValidationWarning[],
    field: string,
    label: string,
    value: unknown
): value is unknown[] {
    if (!Array.isArray(value)) {
        pushError(warnings, field, `${label} 목록이 유효하지 않습니다.`);
        return false;
    }
    if (value.length > MAX_PLAN_COLLECTION_ITEMS) {
        pushError(
            warnings,
            field,
            `${label} 항목 수는 ${MAX_PLAN_COLLECTION_ITEMS}개 이하여야 합니다.`
        );
    }
    return true;
}

export function ensurePlanShape(warnings: ValidationWarning[], plan: SimulationPlanV3): boolean {
    const candidate = plan as unknown;
    if (!requireRecord(warnings, "plan", "플랜", candidate)) {
        return false;
    }

    const record = candidate as Record<string, unknown>;
    let valid = true;
    valid = requireRecord(warnings, "plan.profile", "프로필", record.profile) && valid;
    valid = requireArray(warnings, "plan.accounts", "계정", record.accounts) && valid;
    valid = requireArray(warnings, "plan.incomeStreams", "소득 흐름", record.incomeStreams) && valid;
    valid = requireRecord(warnings, "plan.expensePlan", "지출 계획", record.expensePlan) && valid;
    valid = requireRecord(warnings, "plan.withdrawalPolicy", "인출 정책", record.withdrawalPolicy) && valid;
    valid = requireRecord(warnings, "plan.simulationSettings", "시뮬레이션 설정", record.simulationSettings) && valid;

    if (!valid) {
        return false;
    }

    const expensePlan = record.expensePlan as Record<string, unknown>;
    const simulationSettings = record.simulationSettings as Record<string, unknown>;
    const withdrawalPolicy = record.withdrawalPolicy as Record<string, unknown>;
    const strategy = withdrawalPolicy.strategy;

    valid = requireRecord(warnings, "plan.expensePlan.monthlyBuckets", "월 지출 버킷", expensePlan.monthlyBuckets) && valid;
    valid = requireArray(warnings, "plan.expensePlan.oneOffEvents", "일회성 이벤트", expensePlan.oneOffEvents) && valid;
    valid = requireArray(warnings, "plan.expensePlan.stageAdjustments", "단계별 지출", expensePlan.stageAdjustments) && valid;
    valid = requireRecord(warnings, "plan.expensePlan.medicalShocks", "의료비 쇼크", expensePlan.medicalShocks) && valid;
    if (isRecord(expensePlan.medicalShocks)) {
        valid = requireArray(
            warnings,
            "plan.expensePlan.medicalShocks.occurrences",
            "의료비 쇼크",
            expensePlan.medicalShocks.occurrences
        ) && valid;
    }
    valid = requireRecord(warnings, "plan.simulationSettings.portfolio", "포트폴리오", simulationSettings.portfolio) && valid;
    if (isRecord(simulationSettings.portfolio)) {
        valid = requireArray(
            warnings,
            "plan.simulationSettings.portfolio.assetClasses",
            "포트폴리오 자산",
            simulationSettings.portfolio.assetClasses
        ) && valid;
    }
    valid = requireRecord(warnings, "plan.simulationSettings.stressTest", "스트레스 테스트", simulationSettings.stressTest) && valid;
    valid = requireRecord(warnings, "plan.simulationSettings.laborIncome", "근로소득 설정", simulationSettings.laborIncome) && valid;
    if (isRecord(simulationSettings.laborIncome) && simulationSettings.laborIncome.events !== undefined) {
        valid = requireArray(
            warnings,
            "plan.simulationSettings.laborIncome.events",
            "근로소득 이벤트",
            simulationSettings.laborIncome.events
        ) && valid;
    }
    valid = requireRecord(warnings, "plan.withdrawalPolicy.strategy", "인출 전략", strategy) && valid;
    valid = requireRecord(warnings, "plan.withdrawalPolicy.healthInsurance", "건강보험 설정", withdrawalPolicy.healthInsurance) && valid;
    valid = requireRecord(warnings, "plan.withdrawalPolicy.taxCredit", "세액공제 설정", withdrawalPolicy.taxCredit) && valid;
    valid = requireRecord(warnings, "plan.withdrawalPolicy.bucket", "버킷 설정", withdrawalPolicy.bucket) && valid;
    valid = requireRecord(warnings, "plan.withdrawalPolicy.rebalancing", "리밸런싱 설정", withdrawalPolicy.rebalancing) && valid;
    valid = requireRecord(warnings, "plan.withdrawalPolicy.severance", "퇴직금 설정", withdrawalPolicy.severance) && valid;

    return valid;
}
