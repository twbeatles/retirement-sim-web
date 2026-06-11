import type { ValidationWarning } from "../types";
import { pushError } from "./shared";

export const VALID_HOUSING_STATUSES = new Set(["own_outright", "rent", "jeonse", "mortgage"]);
export const VALID_WITHDRAWAL_STRATEGIES = new Set([
    "fixed_amount",
    "target_spending",
    "fixed_percentage",
    "safe_withdrawal_rate",
    "vpw",
    "guardrails",
    "bucket"
]);
export const VALID_ACCOUNT_TYPES = new Set([
    "cash",
    "taxable_investment",
    "pension_savings",
    "irp",
    "dc",
    "db",
    "annuity",
    "residence",
    "investment_real_estate",
    "debt"
]);
export const VALID_INCOME_TYPES = new Set([
    "salary",
    "national_pension",
    "private_annuity",
    "db_pension",
    "rental_income",
    "business_income",
    "severance",
    "reverse_mortgage"
]);
export const VALID_TAX_TREATMENTS = new Set(["taxable", "tax_deferred", "tax_exempt", "non_taxable"]);
export const VALID_HEALTH_INSURANCE_TREATMENTS = new Set(["assessable", "excluded", "property_only"]);
export const VALID_SIMPLE_DETAIL_MODES = new Set(["simple", "detailed"]);
export const VALID_TAX_CREDIT_MODES = new Set(["manual", "law_2026"]);
export const VALID_REBALANCING_FREQUENCIES = new Set(["monthly", "quarterly", "semi-annual", "annual", "threshold"]);
export const VALID_BUCKET_REBALANCE_FREQUENCIES = new Set(["annual", "semi-annual"]);
export const VALID_SEVERANCE_PAYOUT_TYPES = new Set(["lump_sum", "annuity"]);

export function pushEnumError(
    warnings: ValidationWarning[],
    field: string,
    validValues: Set<string>,
    message: string,
    value: unknown
) {
    if (typeof value !== "string" || !validValues.has(value)) {
        pushError(warnings, field, message);
    }
}
