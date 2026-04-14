import type { SimulationPlanV2 } from "../planV2";
import type { SimulationInput, ValidationWarning } from "../types";
import {
    pushError,
    pushInfo,
    pushWarning,
    requireFinite,
    requireNonNegative,
    requireRatio,
} from "./shared";

export function validatePlanV2(
    warnings: ValidationWarning[],
    input: SimulationInput,
    plan: SimulationPlanV2
) {
    if (plan.planVersion !== "v2") {
        pushError(warnings, "plan_v2.planVersion", "계획 스키마 버전이 지원되지 않습니다.");
        return;
    }

    requireFinite(warnings, "plan_v2.profile.currentAge", "계획 현재 나이", plan.profile.currentAge);
    requireFinite(warnings, "plan_v2.profile.retirementAge", "계획 은퇴 나이", plan.profile.retirementAge);
    requireFinite(warnings, "plan_v2.profile.endAge", "계획 종료 나이", plan.profile.endAge);

    const accountIds = new Set<string>();
    plan.accounts.forEach((account, index) => {
        const fieldBase = `plan_v2.accounts.${index}`;
        accountIds.add(account.id);

        requireFinite(warnings, `${fieldBase}.balance`, `계좌 "${account.name}" 잔고`, account.balance);
        requireNonNegative(warnings, `${fieldBase}.balance`, `계좌 "${account.name}" 잔고`, account.balance);

        if (account.monthlyContribution !== undefined) {
            requireFinite(warnings, `${fieldBase}.monthlyContribution`, `계좌 "${account.name}" 월 납입액`, account.monthlyContribution);
            requireNonNegative(warnings, `${fieldBase}.monthlyContribution`, `계좌 "${account.name}" 월 납입액`, account.monthlyContribution);
        }

        if (account.annualReturn !== undefined && (account.annualReturn < -0.5 || account.annualReturn > 0.5)) {
            pushWarning(warnings, `${fieldBase}.annualReturn`, `계좌 "${account.name}" 기대수익률 범위를 확인해주세요.`);
        }

        if (account.annualVolatility !== undefined && account.annualVolatility < 0) {
            pushError(warnings, `${fieldBase}.annualVolatility`, `계좌 "${account.name}" 변동성은 0 이상이어야 합니다.`);
        }

        if (account.debtTerms) {
            requireRatio(warnings, `${fieldBase}.debtTerms.annualInterest`, `계좌 "${account.name}" 부채 금리`, account.debtTerms.annualInterest);
            requireFinite(warnings, `${fieldBase}.debtTerms.monthlyPayment`, `계좌 "${account.name}" 월 상환액`, account.debtTerms.monthlyPayment);
            requireNonNegative(warnings, `${fieldBase}.debtTerms.monthlyPayment`, `계좌 "${account.name}" 월 상환액`, account.debtTerms.monthlyPayment);
        }

        if (account.payout?.monthlyPayout !== undefined) {
            requireFinite(warnings, `${fieldBase}.payout.monthlyPayout`, `계좌 "${account.name}" 월 수령액`, account.payout.monthlyPayout);
            requireNonNegative(warnings, `${fieldBase}.payout.monthlyPayout`, `계좌 "${account.name}" 월 수령액`, account.payout.monthlyPayout);
        }

        if (account.realEstate) {
            if (account.realEstate.rentalYield < 0) {
                pushError(warnings, `${fieldBase}.realEstate.rentalYield`, `계좌 "${account.name}" 임대수익률은 0 이상이어야 합니다.`);
            }
            if (account.realEstate.managementCost < 0) {
                pushError(warnings, `${fieldBase}.realEstate.managementCost`, `계좌 "${account.name}" 관리비율은 0 이상이어야 합니다.`);
            }
        }
    });

    plan.incomeStreams.forEach((stream, index) => {
        const fieldBase = `plan_v2.incomeStreams.${index}`;
        requireFinite(warnings, `${fieldBase}.monthlyAmount`, `소득 "${stream.name}" 월 금액`, stream.monthlyAmount);
        requireNonNegative(warnings, `${fieldBase}.monthlyAmount`, `소득 "${stream.name}" 월 금액`, stream.monthlyAmount);
        requireFinite(warnings, `${fieldBase}.startAge`, `소득 "${stream.name}" 시작 나이`, stream.startAge);

        if (stream.endAge !== undefined && stream.endAge <= stream.startAge) {
            pushError(warnings, `${fieldBase}.endAge`, `소득 "${stream.name}" 종료 나이는 시작 나이보다 커야 합니다.`);
        }

        if (stream.sourceAccountId && !accountIds.has(stream.sourceAccountId)) {
            pushWarning(warnings, `${fieldBase}.sourceAccountId`, `소득 "${stream.name}"의 연결 계좌를 찾을 수 없습니다.`);
        }
    });

    requireFinite(warnings, "plan_v2.expensePlan.essentialMonthly", "필수생활비", plan.expensePlan.essentialMonthly);
    requireNonNegative(warnings, "plan_v2.expensePlan.essentialMonthly", "필수생활비", plan.expensePlan.essentialMonthly);
    requireFinite(warnings, "plan_v2.expensePlan.discretionaryMonthly", "선택생활비", plan.expensePlan.discretionaryMonthly);
    requireNonNegative(warnings, "plan_v2.expensePlan.discretionaryMonthly", "선택생활비", plan.expensePlan.discretionaryMonthly);
    requireFinite(warnings, "plan_v2.expensePlan.housingMonthly", "주거비", plan.expensePlan.housingMonthly);
    requireNonNegative(warnings, "plan_v2.expensePlan.housingMonthly", "주거비", plan.expensePlan.housingMonthly);
    requireFinite(warnings, "plan_v2.expensePlan.medicalBaselineMonthly", "기본 의료비", plan.expensePlan.medicalBaselineMonthly);
    requireNonNegative(warnings, "plan_v2.expensePlan.medicalBaselineMonthly", "기본 의료비", plan.expensePlan.medicalBaselineMonthly);

    plan.expensePlan.oneOffEvents.forEach((event, index) => {
        if (!Number.isInteger(event.monthIndex) || event.monthIndex < 0) {
            pushError(warnings, `plan_v2.expensePlan.oneOffEvents.${index}.monthIndex`, `계획 일회성 이벤트 "${event.name}" 시점이 유효하지 않습니다.`);
        }
        requireFinite(warnings, `plan_v2.expensePlan.oneOffEvents.${index}.amount`, `계획 일회성 이벤트 "${event.name}" 금액`, event.amount);
    });

    plan.expensePlan.stageAdjustments.forEach((expense, index) => {
        const fieldBase = `plan_v2.expensePlan.stageAdjustments.${index}`;
        requireFinite(warnings, `${fieldBase}.amount`, `단계별 지출 "${expense.name}" 금액`, expense.amount);
        requireNonNegative(warnings, `${fieldBase}.amount`, `단계별 지출 "${expense.name}" 금액`, expense.amount);
        requireFinite(warnings, `${fieldBase}.startAge`, `단계별 지출 "${expense.name}" 시작 나이`, expense.startAge);

        if (expense.endAge !== undefined && expense.endAge < expense.startAge) {
            pushError(warnings, `${fieldBase}.endAge`, `단계별 지출 "${expense.name}" 종료 나이는 시작 나이보다 빠를 수 없습니다.`);
        }

        if (expense.isRecurring && expense.intervalYears !== undefined && expense.intervalYears <= 0) {
            pushError(warnings, `${fieldBase}.intervalYears`, `단계별 지출 "${expense.name}" 반복 간격은 0보다 커야 합니다.`);
        }
    });

    requireFinite(
        warnings,
        "plan_v2.withdrawalPolicy.retirementSpendingTarget",
        "은퇴 지출 목표",
        plan.withdrawalPolicy.retirementSpendingTarget
    );
    requireNonNegative(
        warnings,
        "plan_v2.withdrawalPolicy.retirementSpendingTarget",
        "은퇴 지출 목표",
        plan.withdrawalPolicy.retirementSpendingTarget
    );

    const essentialBaseline =
        plan.expensePlan.essentialMonthly
        + plan.expensePlan.housingMonthly
        + plan.expensePlan.medicalBaselineMonthly;
    if (
        essentialBaseline > 0 &&
        plan.withdrawalPolicy.retirementSpendingTarget > 0 &&
        plan.withdrawalPolicy.retirementSpendingTarget < essentialBaseline
    ) {
        pushInfo(
            warnings,
            "plan_v2.withdrawalPolicy.retirementSpendingTarget",
            "필수생활비 합계가 은퇴 지출 목표보다 커서 계산 시 더 큰 값이 반영됩니다."
        );
    }

    if (
        plan.profile.currentAge !== input.current_age
        || plan.profile.retirementAge !== input.retire_age
        || plan.profile.endAge !== input.end_age
    ) {
        pushInfo(warnings, "plan_v2.profile", "계획 스냅샷과 현재 입력 나이가 달라 최신 값으로 동기화됩니다.");
    }
}
