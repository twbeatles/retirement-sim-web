import type { PlanIncomeStream } from "../../logic/plan";
import type { HousingStatus } from "../../logic/types";

export const PLAN_STREAM_TYPES: Array<{ value: PlanIncomeStream["type"]; label: string }> = [
    { value: "salary", label: "근로소득" },
    { value: "national_pension", label: "국민연금" },
    { value: "business_income", label: "사업소득" },
    { value: "rental_income", label: "임대소득" },
    { value: "severance", label: "퇴직금" },
    { value: "reverse_mortgage", label: "주택연금" },
];

export const HOUSING_OPTIONS: Array<{ value: HousingStatus; label: string }> = [
    { value: "own_outright", label: "자가 보유" },
    { value: "mortgage", label: "주택담보대출" },
    { value: "jeonse", label: "전세" },
    { value: "rent", label: "월세" },
];
