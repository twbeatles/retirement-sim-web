import type { SimulationPlanV3 } from "../plan";
import { MAX_FULL_MONTE_CARLO_PATHS } from "../runtimeLimits";
import type { ValidationWarning } from "../types";
import { resolveSimulationRuleSet } from "../rules/kr";
import {
    isFiniteNumber,
    pushError,
    pushInfo,
    pushWarning,
    requireFinite,
    requireNonNegative,
    requireRatio,
} from "./shared";
import { VALID_SIMULATION_MODES } from "./runtimePolicy";
import {
    pushEnumError,
    VALID_ACCOUNT_TYPES,
    VALID_BUCKET_REBALANCE_FREQUENCIES,
    VALID_HEALTH_INSURANCE_TREATMENTS,
    VALID_HOUSING_STATUSES,
    VALID_INCOME_TYPES,
    VALID_REBALANCING_FREQUENCIES,
    VALID_SEVERANCE_PAYOUT_TYPES,
    VALID_SIMPLE_DETAIL_MODES,
    VALID_TAX_CREDIT_MODES,
    VALID_TAX_TREATMENTS,
    VALID_WITHDRAWAL_STRATEGIES,
} from "./planV3Enums";
import { ensurePlanShape, isRecord } from "./planV3Shape";

type ValidatePlanOptions = {
    validateRulebook?: boolean;
};

export function validatePlanV3(
    warnings: ValidationWarning[],
    plan: SimulationPlanV3,
    options: ValidatePlanOptions = {}
): void {
    const { validateRulebook = true } = options;

    if (!isRecord(plan)) {
        pushError(warnings, "plan", "플랜 구조가 유효하지 않습니다.");
        return;
    }

    if (plan.planVersion !== "v3") {
        pushError(warnings, "plan.planVersion", "지원되지 않는 플랜 스키마 버전입니다.");
        return;
    }

    if (!ensurePlanShape(warnings, plan)) {
        return;
    }

    if (validateRulebook) {
        try {
            resolveSimulationRuleSet(plan.rulebook);
        } catch (error) {
            pushError(
                warnings,
                "plan.rulebook",
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    requireFinite(warnings, "plan.profile.currentAge", "플랜 현재 나이", plan.profile.currentAge);
    requireFinite(
        warnings,
        "plan.profile.retirementAge",
        "플랜 은퇴 나이",
        plan.profile.retirementAge
    );
    requireFinite(warnings, "plan.profile.endAge", "플랜 종료 나이", plan.profile.endAge);

    if (plan.profile.retirementAge <= plan.profile.currentAge) {
        pushError(
            warnings,
            "plan.profile.retirementAge",
            "은퇴 나이는 현재 나이보다 커야 합니다."
        );
    }

    if (plan.profile.endAge <= plan.profile.retirementAge) {
        pushError(warnings, "plan.profile.endAge", "종료 나이는 은퇴 나이보다 커야 합니다.");
    }

    pushEnumError(
        warnings,
        "plan.profile.housingStatus",
        VALID_HOUSING_STATUSES,
        "주거 상태가 유효하지 않습니다.",
        plan.profile.housingStatus
    );

    const accountIds = new Set<string>();
    plan.accounts.forEach((account, index) => {
        const fieldBase = `plan.accounts.${index}`;
        if (accountIds.has(account.id)) {
            pushError(warnings, `${fieldBase}.id`, `계정 ID "${account.id}"가 중복됩니다.`);
        }
        accountIds.add(account.id);

        pushEnumError(warnings, `${fieldBase}.type`, VALID_ACCOUNT_TYPES, `계정 "${account.name}" 유형이 유효하지 않습니다.`, account.type);
        pushEnumError(
            warnings,
            `${fieldBase}.taxTreatment`,
            VALID_TAX_TREATMENTS,
            `계정 "${account.name}" 세무 처리가 유효하지 않습니다.`,
            account.taxTreatment
        );
        pushEnumError(
            warnings,
            `${fieldBase}.healthInsuranceTreatment`,
            VALID_HEALTH_INSURANCE_TREATMENTS,
            `계정 "${account.name}" 건강보험 처리가 유효하지 않습니다.`,
            account.healthInsuranceTreatment
        );

        requireFinite(warnings, `${fieldBase}.balance`, `계정 "${account.name}" 잔액`, account.balance);
        requireNonNegative(
            warnings,
            `${fieldBase}.balance`,
            `계정 "${account.name}" 잔액`,
            account.balance
        );

        if (account.monthlyContribution !== undefined) {
            requireFinite(
                warnings,
                `${fieldBase}.monthlyContribution`,
                `계정 "${account.name}" 월 납입액`,
                account.monthlyContribution
            );
            requireNonNegative(
                warnings,
                `${fieldBase}.monthlyContribution`,
                `계정 "${account.name}" 월 납입액`,
                account.monthlyContribution
            );
        }

        if (account.annualReturn !== undefined && (account.annualReturn < -0.5 || account.annualReturn > 0.5)) {
            pushWarning(
                warnings,
                `${fieldBase}.annualReturn`,
                `계정 "${account.name}" 연 수익률이 일반적인 범위를 벗어난 것으로 보입니다.`
            );
        }
        if (account.annualReturn !== undefined && isFiniteNumber(account.annualReturn) && account.annualReturn <= -1) {
            pushError(
                warnings,
                `${fieldBase}.annualReturn`,
                `계정 "${account.name}" 연 수익률은 -100%보다 커야 합니다.`
            );
        }

        if (account.annualVolatility !== undefined && account.annualVolatility < 0) {
            pushError(
                warnings,
                `${fieldBase}.annualVolatility`,
                `계정 "${account.name}" 연 변동성은 0 이상이어야 합니다.`
            );
        }

        requireFinite(
            warnings,
            `${fieldBase}.withdrawalPriority`,
            `계정 "${account.name}" 인출 우선순위`,
            account.withdrawalPriority
        );

        if (Number.isFinite(account.withdrawalPriority) && account.withdrawalPriority <= 0) {
            pushError(
                warnings,
                `${fieldBase}.withdrawalPriority`,
                `계정 "${account.name}" 인출 우선순위는 0보다 커야 합니다.`
            );
        }

        if (account.debtTerms) {
            requireRatio(
                warnings,
                `${fieldBase}.debtTerms.annualInterest`,
                `계정 "${account.name}" 부채 이자율`,
                account.debtTerms.annualInterest
            );
            requireFinite(
                warnings,
                `${fieldBase}.debtTerms.monthlyPayment`,
                `계정 "${account.name}" 월 상환액`,
                account.debtTerms.monthlyPayment
            );
            requireNonNegative(
                warnings,
                `${fieldBase}.debtTerms.monthlyPayment`,
                `계정 "${account.name}" 월 상환액`,
                account.debtTerms.monthlyPayment
            );
        }

        if (account.payout?.monthlyPayout !== undefined) {
            requireFinite(
                warnings,
                `${fieldBase}.payout.monthlyPayout`,
                `계정 "${account.name}" 월 수령액`,
                account.payout.monthlyPayout
            );
            requireNonNegative(
                warnings,
                `${fieldBase}.payout.monthlyPayout`,
                `계정 "${account.name}" 월 수령액`,
                account.payout.monthlyPayout
            );
        }

        if (account.realEstate) {
            if (account.realEstate.rentalYield < 0) {
                pushError(
                    warnings,
                    `${fieldBase}.realEstate.rentalYield`,
                    `계정 "${account.name}" 임대수익률은 0 이상이어야 합니다.`
                );
            }
            if (account.realEstate.managementCost < 0) {
                pushError(
                    warnings,
                    `${fieldBase}.realEstate.managementCost`,
                    `계정 "${account.name}" 관리비율은 0 이상이어야 합니다.`
                );
            }
        }
    });

    const streamIds = new Set<string>();
    plan.incomeStreams.forEach((stream, index) => {
        const fieldBase = `plan.incomeStreams.${index}`;
        if (streamIds.has(stream.id)) {
            pushError(warnings, `${fieldBase}.id`, `소득 흐름 ID "${stream.id}"가 중복됩니다.`);
        }
        streamIds.add(stream.id);
        pushEnumError(
            warnings,
            `${fieldBase}.type`,
            VALID_INCOME_TYPES,
            `소득 흐름 "${stream.name}" 유형이 유효하지 않습니다.`,
            stream.type
        );
        requireFinite(
            warnings,
            `${fieldBase}.monthlyAmount`,
            `소득 흐름 "${stream.name}" 월 금액`,
            stream.monthlyAmount
        );
        requireNonNegative(
            warnings,
            `${fieldBase}.monthlyAmount`,
            `소득 흐름 "${stream.name}" 월 금액`,
            stream.monthlyAmount
        );
        requireFinite(warnings, `${fieldBase}.startAge`, `소득 흐름 "${stream.name}" 시작 나이`, stream.startAge);

        if (stream.endAge !== undefined && stream.endAge <= stream.startAge) {
            pushError(
                warnings,
                `${fieldBase}.endAge`,
                `소득 흐름 "${stream.name}" 종료 나이는 시작 나이보다 커야 합니다.`
            );
        }

        if (stream.annualGrowthRate !== undefined && !Number.isFinite(stream.annualGrowthRate)) {
            pushError(
                warnings,
                `${fieldBase}.annualGrowthRate`,
                `소득 흐름 "${stream.name}" 성장률은 유한한 숫자여야 합니다.`
            );
        }

        if (stream.sourceAccountId && !accountIds.has(stream.sourceAccountId)) {
            pushWarning(
                warnings,
                `${fieldBase}.sourceAccountId`,
                `소득 흐름 "${stream.name}"이 알 수 없는 계정을 참조합니다.`
            );
        }
    });

    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.essential",
        "월 필수 생활비",
        plan.expensePlan.monthlyBuckets.essential
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.essential",
        "월 필수 생활비",
        plan.expensePlan.monthlyBuckets.essential
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.discretionary",
        "월 선택 지출",
        plan.expensePlan.monthlyBuckets.discretionary
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.discretionary",
        "월 선택 지출",
        plan.expensePlan.monthlyBuckets.discretionary
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.housing",
        "월 주거비",
        plan.expensePlan.monthlyBuckets.housing
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.housing",
        "월 주거비",
        plan.expensePlan.monthlyBuckets.housing
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.medical",
        "월 의료비",
        plan.expensePlan.monthlyBuckets.medical
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.medical",
        "월 의료비",
        plan.expensePlan.monthlyBuckets.medical
    );
    requireFinite(
        warnings,
        "plan.expensePlan.monthlyBuckets.dependentSupport",
        "월 부양비",
        plan.expensePlan.monthlyBuckets.dependentSupport
    );
    requireNonNegative(
        warnings,
        "plan.expensePlan.monthlyBuckets.dependentSupport",
        "월 부양비",
        plan.expensePlan.monthlyBuckets.dependentSupport
    );

    plan.expensePlan.oneOffEvents.forEach((event, index) => {
        if (!Number.isInteger(event.monthIndex) || event.monthIndex < 0) {
            pushError(
                warnings,
                `plan.expensePlan.oneOffEvents.${index}.monthIndex`,
                `일회성 이벤트 "${event.name}"의 월 번호는 0 이상의 정수여야 합니다.`
            );
        }
        requireFinite(
            warnings,
            `plan.expensePlan.oneOffEvents.${index}.amount`,
            `일회성 이벤트 "${event.name}" 금액`,
            event.amount
        );
    });

    plan.expensePlan.stageAdjustments.forEach((expense, index) => {
        const fieldBase = `plan.expensePlan.stageAdjustments.${index}`;
        requireFinite(warnings, `${fieldBase}.amount`, `단계별 지출 "${expense.name}" 금액`, expense.amount);
        requireNonNegative(
            warnings,
            `${fieldBase}.amount`,
            `단계별 지출 "${expense.name}" 금액`,
            expense.amount
        );
        requireFinite(warnings, `${fieldBase}.startAge`, `단계별 지출 "${expense.name}" 시작 나이`, expense.startAge);

        if (expense.endAge !== undefined && expense.endAge < expense.startAge) {
            pushError(
                warnings,
                `${fieldBase}.endAge`,
                `단계별 지출 "${expense.name}" 종료 나이는 시작 나이보다 빠를 수 없습니다.`
            );
        }

        if (expense.isRecurring && expense.intervalYears !== undefined && expense.intervalYears <= 0) {
            pushError(
                warnings,
                `${fieldBase}.intervalYears`,
                `단계별 지출 "${expense.name}" 반복 간격은 0보다 커야 합니다.`
            );
        }
    });

    requireFinite(
        warnings,
        "plan.withdrawalPolicy.retirementSpendingTarget",
        "은퇴 생활비 목표",
        plan.withdrawalPolicy.retirementSpendingTarget
    );
    requireNonNegative(
        warnings,
        "plan.withdrawalPolicy.retirementSpendingTarget",
        "은퇴 생활비 목표",
        plan.withdrawalPolicy.retirementSpendingTarget
    );

    const essentialBaseline =
        plan.expensePlan.monthlyBuckets.essential +
        plan.expensePlan.monthlyBuckets.housing +
        plan.expensePlan.monthlyBuckets.medical;

    if (
        essentialBaseline > 0 &&
        plan.withdrawalPolicy.retirementSpendingTarget > 0 &&
        plan.withdrawalPolicy.retirementSpendingTarget < essentialBaseline
    ) {
        pushInfo(
            warnings,
            "plan.withdrawalPolicy.retirementSpendingTarget",
            "은퇴 생활비 목표가 필수 생활비 기준보다 낮습니다."
        );
    }

    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.strategy.strategy",
        VALID_WITHDRAWAL_STRATEGIES,
        "인출 전략이 유효하지 않습니다.",
        plan.withdrawalPolicy.strategy.strategy
    );
    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.strategy.taxStrategy",
        VALID_SIMPLE_DETAIL_MODES,
        "세금 계산 방식이 유효하지 않습니다.",
        plan.withdrawalPolicy.strategy.taxStrategy ?? "simple"
    );
    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.healthInsurance.mode",
        VALID_SIMPLE_DETAIL_MODES,
        "건강보험 계산 방식이 유효하지 않습니다.",
        plan.withdrawalPolicy.healthInsurance.mode
    );
    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.taxCredit.mode",
        VALID_TAX_CREDIT_MODES,
        "세액공제 모드가 유효하지 않습니다.",
        plan.withdrawalPolicy.taxCredit.mode
    );
    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.rebalancing.frequency",
        VALID_REBALANCING_FREQUENCIES,
        "리밸런싱 주기가 유효하지 않습니다.",
        plan.withdrawalPolicy.rebalancing.frequency
    );
    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.bucket.rebalanceFrequency",
        VALID_BUCKET_REBALANCE_FREQUENCIES,
        "버킷 리밸런싱 주기가 유효하지 않습니다.",
        plan.withdrawalPolicy.bucket.rebalanceFrequency
    );
    pushEnumError(
        warnings,
        "plan.withdrawalPolicy.severance.payoutType",
        VALID_SEVERANCE_PAYOUT_TYPES,
        "퇴직금 수령 방식이 유효하지 않습니다.",
        plan.withdrawalPolicy.severance.payoutType
    );

    pushEnumError(
        warnings,
        "plan.simulationSettings.mode",
        VALID_SIMULATION_MODES,
        "시뮬레이션 모드가 유효하지 않습니다.",
        plan.simulationSettings.mode
    );
    requireFinite(
        warnings,
        "plan.simulationSettings.monteCarloPaths",
        "플랜 몬테카를로 경로 수",
        plan.simulationSettings.monteCarloPaths
    );
    if (
        isFiniteNumber(plan.simulationSettings.monteCarloPaths) &&
        !Number.isInteger(plan.simulationSettings.monteCarloPaths)
    ) {
        pushError(warnings, "plan.simulationSettings.monteCarloPaths", "플랜 몬테카를로 경로 수는 정수여야 합니다.");
    }
    if (isFiniteNumber(plan.simulationSettings.monteCarloPaths) && plan.simulationSettings.monteCarloPaths < 1) {
        pushError(warnings, "plan.simulationSettings.monteCarloPaths", "플랜 몬테카를로 경로 수는 1 이상이어야 합니다.");
    }
    if (
        isFiniteNumber(plan.simulationSettings.monteCarloPaths) &&
        plan.simulationSettings.monteCarloPaths > MAX_FULL_MONTE_CARLO_PATHS
    ) {
        pushError(
            warnings,
            "plan.simulationSettings.monteCarloPaths",
            `플랜 몬테카를로 경로 수는 ${MAX_FULL_MONTE_CARLO_PATHS.toLocaleString()}개 이하여야 합니다.`
        );
    }
    if (plan.simulationSettings.seed !== undefined && !Number.isFinite(plan.simulationSettings.seed)) {
        pushError(warnings, "plan.simulationSettings.seed", "플랜 시뮬레이션 시드는 유한한 숫자여야 합니다.");
    }

    requireFinite(
        warnings,
        "plan.simulationSettings.annualInflation",
        "플랜 연 물가상승률",
        plan.simulationSettings.annualInflation
    );
    if (
        isFiniteNumber(plan.simulationSettings.annualInflation) &&
        plan.simulationSettings.annualInflation <= -1
    ) {
        pushError(
            warnings,
            "plan.simulationSettings.annualInflation",
            "플랜 연 물가상승률은 -100%보다 커야 합니다."
        );
    }

    plan.simulationSettings.portfolio.assetClasses.forEach((asset, index) => {
        const fieldBase = `plan.simulationSettings.portfolio.assetClasses.${index}`;
        requireFinite(
            warnings,
            `${fieldBase}.expectedAnnualReturn`,
            `포트폴리오 자산 "${asset.name}" 기대수익률`,
            asset.expectedAnnualReturn
        );
        if (isFiniteNumber(asset.expectedAnnualReturn) && asset.expectedAnnualReturn <= -1) {
            pushError(
                warnings,
                `${fieldBase}.expectedAnnualReturn`,
                `포트폴리오 자산 "${asset.name}" 기대수익률은 -100%보다 커야 합니다.`
            );
        }
        requireFinite(
            warnings,
            `${fieldBase}.annualVolatility`,
            `포트폴리오 자산 "${asset.name}" 연 변동성`,
            asset.annualVolatility
        );
        if (isFiniteNumber(asset.annualVolatility) && asset.annualVolatility < 0) {
            pushError(
                warnings,
                `${fieldBase}.annualVolatility`,
                `포트폴리오 자산 "${asset.name}" 연 변동성은 0 이상이어야 합니다.`
            );
        }
    });

    const stressTest = plan.simulationSettings.stressTest;
    if (stressTest.enabled) {
        requireFinite(
            warnings,
            "plan.simulationSettings.stressTest.annualDeclineRate",
            "플랜 스트레스 테스트 연간 하락률",
            stressTest.annualDeclineRate
        );
        if (isFiniteNumber(stressTest.annualDeclineRate) && stressTest.annualDeclineRate >= 1) {
            pushError(
                warnings,
                "plan.simulationSettings.stressTest.annualDeclineRate",
                "플랜 스트레스 테스트 연간 하락률은 100% 미만이어야 합니다."
            );
        }
    }
}
