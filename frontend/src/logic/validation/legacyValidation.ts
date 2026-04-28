import { getHistoricalYearRange } from "../historicalData";
import type { SimulationInput, ValidationWarning } from "../types";
import {
    isFiniteNumber,
    pushError,
    pushInfo,
    pushWarning,
    requireFinite,
    requireNonNegative,
    requireRatio,
} from "./shared";

export function validateLegacySimulationInput(
    input: SimulationInput,
    warnings: ValidationWarning[]
) {
    requireFinite(warnings, "current_age", "현재 나이", input.current_age);
    requireFinite(warnings, "retire_age", "은퇴 나이", input.retire_age);
    requireFinite(warnings, "end_age", "종료 나이", input.end_age);

    if (input.current_age > input.retire_age) {
        pushError(warnings, "retire_age", "은퇴 나이는 현재 나이와 같거나 커야 합니다.");
    }
    if (input.current_age === input.retire_age) {
        pushInfo(warnings, "retire_age", "현재 시점 은퇴로 계산됩니다.");
    }
    if (input.end_age <= input.current_age) {
        pushError(warnings, "end_age", "종료 나이는 현재 나이보다 커야 합니다.");
    }
    if (input.retire_age >= input.end_age) {
        pushError(warnings, "end_age", "종료 나이는 은퇴 나이보다 커야 합니다.");
    }
    if (input.end_age > 120) {
        pushWarning(warnings, "end_age", "종료 나이가 너무 높습니다 (120세 이하 권장).");
    }

    requireFinite(warnings, "annual_inflation", "연간 물가상승률", input.annual_inflation);
    if (isFiniteNumber(input.annual_inflation) && input.annual_inflation <= -1) {
        pushError(warnings, "annual_inflation", "연간 물가상승률은 -100%보다 커야 합니다.");
    }
    if (isFiniteNumber(input.annual_inflation) && input.annual_inflation < -0.02) {
        pushWarning(warnings, "annual_inflation", "연간 물가상승률이 -2%보다 낮습니다. 가정을 다시 확인해주세요.");
    }
    if (isFiniteNumber(input.annual_inflation) && input.annual_inflation > 0.20) {
        pushWarning(warnings, "annual_inflation", "연간 물가상승률이 20%를 초과합니다. 비현실적인 가정일 수 있습니다.");
    }
    if (input.annual_inflation > 0.05) {
        pushInfo(warnings, "annual_inflation", "물가상승률이 5% 이상입니다. 지속적인 고인플레 상황을 가정하고 있습니다.");
    }

    requireFinite(warnings, "general.current_balance", "현재 금융자산", input.general.current_balance);
    requireNonNegative(warnings, "general.current_balance", "현재 금융자산", input.general.current_balance);
    requireFinite(warnings, "general.monthly_contribution", "월 저축액", input.general.monthly_contribution);
    requireNonNegative(warnings, "general.monthly_contribution", "월 저축액", input.general.monthly_contribution);

    requireFinite(warnings, "private_pension.current_balance", "개인연금 현재 잔고", input.private_pension.current_balance);
    requireNonNegative(warnings, "private_pension.current_balance", "개인연금 현재 잔고", input.private_pension.current_balance);
    requireFinite(warnings, "private_pension.monthly_contribution", "개인연금 월 납입액", input.private_pension.monthly_contribution);
    requireNonNegative(warnings, "private_pension.monthly_contribution", "개인연금 월 납입액", input.private_pension.monthly_contribution);
    requireFinite(warnings, "private_pension.annual_return", "개인연금 예상 수익률", input.private_pension.annual_return);
    if (isFiniteNumber(input.private_pension.annual_return) && input.private_pension.annual_return <= -1) {
        pushError(warnings, "private_pension.annual_return", "개인연금 예상 수익률은 -100%보다 커야 합니다.");
    }
    if (isFiniteNumber(input.private_pension.annual_return) && (input.private_pension.annual_return < -0.5 || input.private_pension.annual_return > 0.5)) {
        pushWarning(warnings, "private_pension.annual_return", "개인연금 예상 수익률 범위를 확인해주세요.");
    }
    requireFinite(warnings, "private_pension.payout_years", "개인연금 수령 기간", input.private_pension.payout_years);
    if (isFiniteNumber(input.private_pension.payout_years) && input.private_pension.payout_years < 0) {
        pushError(warnings, "private_pension.payout_years", "개인연금 수령 기간은 0 이상이어야 합니다.");
    }
    requireFinite(warnings, "private_pension.annuity_annual_rate", "개인연금 연금화 이율", input.private_pension.annuity_annual_rate);
    if (isFiniteNumber(input.private_pension.annuity_annual_rate) && input.private_pension.annuity_annual_rate <= -1) {
        pushError(warnings, "private_pension.annuity_annual_rate", "개인연금 연금화 이율은 -100%보다 커야 합니다.");
    }
    if (isFiniteNumber(input.private_pension.annuity_annual_rate) && (input.private_pension.annuity_annual_rate < 0 || input.private_pension.annuity_annual_rate > 0.2)) {
        pushWarning(warnings, "private_pension.annuity_annual_rate", "개인연금 연금화 이율 범위를 확인해주세요.");
    }

    requireFinite(warnings, "national_pension.expected_monthly_benefit_at_retirement", "국민연금 예상 월 수령액", input.national_pension.expected_monthly_benefit_at_retirement);
    requireNonNegative(warnings, "national_pension.expected_monthly_benefit_at_retirement", "국민연금 예상 월 수령액", input.national_pension.expected_monthly_benefit_at_retirement);
    if (input.national_pension.startAge && (input.national_pension.startAge < 60 || input.national_pension.startAge > 70)) {
        pushWarning(warnings, "national_pension.startAge", "국민연금 수령 개시 연령은 60~70세 사이여야 합니다.");
    }

    requireFinite(warnings, "debt.current_balance", "부채 잔액", input.debt.current_balance);
    requireNonNegative(warnings, "debt.current_balance", "부채 잔액", input.debt.current_balance);
    requireFinite(warnings, "debt.annual_interest", "부채 금리", input.debt.annual_interest);
    if (isFiniteNumber(input.debt.annual_interest) && (input.debt.annual_interest < 0 || input.debt.annual_interest > 1)) {
        pushError(warnings, "debt.annual_interest", "부채 금리는 0%~100% 범위여야 합니다.");
    }
    requireFinite(warnings, "debt.monthly_payment", "부채 월 상환액", input.debt.monthly_payment);
    requireNonNegative(warnings, "debt.monthly_payment", "부채 월 상환액", input.debt.monthly_payment);
    if (input.debt.current_balance > 0 && input.debt.monthly_payment <= 0) {
        pushWarning(warnings, "debt.monthly_payment", "부채가 있을 때 월 상환액이 0원입니다.");
    }

    if (!Number.isFinite(input.simulation_settings.mc_paths) || !Number.isInteger(input.simulation_settings.mc_paths)) {
        pushError(warnings, "simulation_settings", "시뮬레이션 횟수는 정수여야 합니다.");
    } else if (input.simulation_settings.mc_paths < 1) {
        pushError(warnings, "simulation_settings", "시뮬레이션 횟수는 1 이상이어야 합니다.");
    } else if (input.simulation_settings.mc_paths > 20000) {
        pushWarning(warnings, "simulation_settings", "시뮬레이션 횟수가 매우 큽니다. 성능 저하 가능성이 있습니다.");
    }

    if (!input.portfolio.assetClasses || input.portfolio.assetClasses.length === 0) {
        pushError(warnings, "portfolio", "포트폴리오에 최소 하나의 자산군이 포함되어야 합니다.");
    } else {
        const totalAlloc = input.portfolio.assetClasses.reduce((sum, a) => sum + a.allocation, 0);
        if (Math.abs(totalAlloc - 1.0) > 0.01) {
            pushError(warnings, "portfolio", `포트폴리오 비중 합계가 ${(totalAlloc * 100).toFixed(0)}%입니다. 100%가 되어야 합니다.`);
        }

        const rho = input.portfolio.manualCorrelation ?? 1;
        if (!Number.isFinite(rho) || rho < -1 || rho > 1) {
            pushError(warnings, "portfolio", "상관계수는 -1 ~ 1 범위여야 합니다.");
        } else {
            let variance = 0;
            for (let i = 0; i < input.portfolio.assetClasses.length; i++) {
                for (let j = 0; j < input.portfolio.assetClasses.length; j++) {
                    const a = input.portfolio.assetClasses[i];
                    const b = input.portfolio.assetClasses[j];
                    const cov = i === j
                        ? a.annualVolatility * b.annualVolatility
                        : rho * a.annualVolatility * b.annualVolatility;
                    variance += a.allocation * b.allocation * cov;
                }
            }
            if (variance < -1e-9) {
                pushError(warnings, "portfolio", "현재 상관계수/변동성 조합은 유효한 공분산 행렬이 아닐 수 있습니다.");
            }
        }
    }

    input.portfolio.assetClasses.forEach((asset) => {
        requireFinite(warnings, "portfolio", `"${asset.name}" 기대 수익률`, asset.expectedAnnualReturn);
        requireFinite(warnings, "portfolio", `"${asset.name}" 변동성`, asset.annualVolatility);
        requireRatio(warnings, "portfolio", `"${asset.name}" 비중`, asset.allocation);

        if (isFiniteNumber(asset.expectedAnnualReturn) && asset.expectedAnnualReturn <= -1) {
            pushError(warnings, "portfolio", `"${asset.name}"의 기대 수익률은 -100%보다 커야 합니다.`);
        }
        if (asset.expectedAnnualReturn > 0.20) {
            pushWarning(warnings, "portfolio", `"${asset.name}"의 기대 수익률(${(asset.expectedAnnualReturn * 100).toFixed(1)}%)이 비현실적으로 높습니다.`);
        }
        if (asset.expectedAnnualReturn < -0.05) {
            pushInfo(warnings, "portfolio", `"${asset.name}"의 기대 수익률이 음수입니다. 장기 투자 시 주의가 필요합니다.`);
        }
        if (asset.annualVolatility > 0.50) {
            pushWarning(warnings, "portfolio", `"${asset.name}"의 변동성(${(asset.annualVolatility * 100).toFixed(1)}%)이 매우 높습니다.`);
        }
        if (asset.annualVolatility < 0) {
            pushError(warnings, "portfolio", `"${asset.name}"의 변동성은 0 이상이어야 합니다.`);
        }
    });

    requireRatio(warnings, "withdrawal.taxRate", "단일 세율", input.withdrawal.taxRate);
    requireRatio(warnings, "withdrawal.initialSafeRate", "초기 인출 비율", input.withdrawal.initialSafeRate);
    requireRatio(warnings, "withdrawal.percentageRate", "정률 인출 비율", input.withdrawal.percentageRate);
    requireRatio(warnings, "withdrawal.vpwMaxWithdrawalRate", "가변 인출 최대 인출률", input.withdrawal.vpwMaxWithdrawalRate);
    requireRatio(warnings, "withdrawal.vpwMinWithdrawalRate", "가변 인출 최소 인출률", input.withdrawal.vpwMinWithdrawalRate);
    requireRatio(warnings, "withdrawal.vpwMaxYoYChange", "연간 인출 변동 상한", input.withdrawal.vpwMaxYoYChange);
    if (input.withdrawal.fixedMonthlyAmount !== undefined) {
        requireFinite(warnings, "withdrawal.fixedMonthlyAmount", "월 고정 인출액", input.withdrawal.fixedMonthlyAmount);
        requireNonNegative(warnings, "withdrawal.fixedMonthlyAmount", "월 고정 인출액", input.withdrawal.fixedMonthlyAmount);
    }
    if (input.withdrawal.targetMonthlySpending !== undefined) {
        requireFinite(warnings, "withdrawal.targetMonthlySpending", "월 목표 생활비", input.withdrawal.targetMonthlySpending);
        requireNonNegative(warnings, "withdrawal.targetMonthlySpending", "월 목표 생활비", input.withdrawal.targetMonthlySpending);
    }
    if (input.withdrawal.strategy === "fixed_amount" && input.withdrawal.fixedMonthlyAmount === undefined) {
        pushError(warnings, "withdrawal.fixedMonthlyAmount", "고정 금액 인출 전략에는 월 고정 인출액이 필요합니다.");
    }
    if (input.withdrawal.strategy === "target_spending" && input.withdrawal.targetMonthlySpending === undefined) {
        pushError(warnings, "withdrawal.targetMonthlySpending", "목표 생활비 충당 전략에는 월 목표 생활비가 필요합니다.");
    }
    if (input.withdrawal.strategy === "fixed_percentage" && input.withdrawal.percentageRate === undefined) {
        pushError(warnings, "withdrawal.percentageRate", "정률 인출 전략에는 연 인출 비율이 필요합니다.");
    }
    if (input.withdrawal.strategy === "safe_withdrawal_rate" && input.withdrawal.initialSafeRate === undefined) {
        pushError(warnings, "withdrawal.initialSafeRate", "4% 룰 전략에는 초기 인출 비율이 필요합니다.");
    }
    if ((input.withdrawal.initialSafeRate || 0) > 0.06) {
        pushWarning(warnings, "withdrawal", "인출률이 6% 이상이면 자산 고갈 위험이 높습니다.");
    }

    input.events.forEach((event, index) => {
        if (!Number.isInteger(event.month_index) || event.month_index < 0) {
            pushError(warnings, "events", `이벤트 ${index + 1}의 시점이 유효하지 않습니다.`);
        }
        if (!isFiniteNumber(event.amount)) {
            pushError(warnings, "events", `이벤트 ${index + 1}의 금액이 유효하지 않습니다.`);
        }
    });

    (input.expense_definitions ?? []).forEach((expense, index) => {
        if (!isFiniteNumber(expense.amount) || expense.amount < 0) {
            pushError(warnings, "expense_definitions", `지출 정의 ${index + 1}의 금액은 0 이상이어야 합니다.`);
        }
        if (!isFiniteNumber(expense.startAge)) {
            pushError(warnings, "expense_definitions", `지출 정의 ${index + 1}의 시작 나이가 유효하지 않습니다.`);
        }
        if (expense.endAge !== undefined && expense.endAge < expense.startAge) {
            pushError(warnings, "expense_definitions", `지출 정의 ${index + 1}의 종료 나이는 시작 나이보다 빠를 수 없습니다.`);
        }
    });

    if (input.realEstate && input.realEstate.length > 0) {
        input.realEstate.forEach((re) => {
            requireFinite(warnings, "realEstate", `부동산 "${re.name}" 가치`, re.currentValue);
            requireNonNegative(warnings, "realEstate", `부동산 "${re.name}" 가치`, re.currentValue);
            requireFinite(warnings, "realEstate", `부동산 "${re.name}" 성장률`, re.growthRate);
            if (isFiniteNumber(re.growthRate) && re.growthRate <= -1) {
                pushError(warnings, "realEstate", `부동산 "${re.name}"의 성장률은 -100%보다 커야 합니다.`);
            }
            if (re.growthRate < -0.2) {
                pushWarning(warnings, "realEstate", `부동산 "${re.name}"의 성장률(${(re.growthRate * 100).toFixed(1)}%)이 지나치게 낮습니다.`);
            }
            if (re.growthRate > 0.2) {
                pushWarning(warnings, "realEstate", `부동산 "${re.name}"의 성장률(${(re.growthRate * 100).toFixed(1)}%)이 비정상적으로 높습니다.`);
            }
            if (re.rentalYield < 0) {
                pushError(warnings, "realEstate", `부동산 "${re.name}"의 임대 수익률은 0 이상이어야 합니다.`);
            }
            if (re.rentalYield > 0.1) {
                pushWarning(warnings, "realEstate", `부동산 "${re.name}"의 임대 수익률(${(re.rentalYield * 100).toFixed(1)}%)이 비정상적으로 높습니다.`);
            }
            if (re.managementCost < 0) {
                pushError(warnings, "realEstate", `부동산 "${re.name}"의 관리 비용률은 0 이상이어야 합니다.`);
            }
            if (re.managementCost > 0.1) {
                pushWarning(warnings, "realEstate", `부동산 "${re.name}"의 관리 비용률(${(re.managementCost * 100).toFixed(1)}%)이 높습니다.`);
            }
        });
    }

    if (input.additionalPensions && input.additionalPensions.length > 0) {
        input.additionalPensions.forEach((pension) => {
            if (pension.currentValue < 0) {
                pushError(warnings, "additionalPensions", `연금 "${pension.name}"의 현재 가치는 0 이상이어야 합니다.`);
            }
            if (pension.monthlyContribution < 0) {
                pushError(warnings, "additionalPensions", `연금 "${pension.name}"의 월 납입액은 0 이상이어야 합니다.`);
            }
            if (pension.startAge < input.retire_age) {
                pushInfo(warnings, "additionalPensions", `연금 "${pension.name}"의 수령 시작 나이(${pension.startAge}세)가 은퇴 나이보다 빠릅니다.`);
            }
            if (pension.startAge > input.end_age) {
                pushWarning(warnings, "additionalPensions", `연금 "${pension.name}"의 수령 시작 나이(${pension.startAge}세)가 시뮬레이션 종료 나이보다 늦습니다.`);
            }
            if ((pension.type === "personal" || pension.type === "dc") && pension.expectedReturn !== undefined) {
                requireFinite(warnings, "additionalPensions", `연금 "${pension.name}"의 기대수익률`, pension.expectedReturn);
                if (isFiniteNumber(pension.expectedReturn) && pension.expectedReturn <= -1) {
                    pushError(warnings, "additionalPensions", `연금 "${pension.name}"의 기대수익률은 -100%보다 커야 합니다.`);
                }
                if (pension.expectedReturn < -0.2 || pension.expectedReturn > 0.2) {
                    pushWarning(warnings, "additionalPensions", `연금 "${pension.name}"의 기대수익률(${(pension.expectedReturn * 100).toFixed(1)}%) 범위를 확인해주세요.`);
                }
            }
            if (pension.payoutType === "fixed_period" && (!pension.payoutYears || pension.payoutYears < 1)) {
                pushError(warnings, "additionalPensions", `연금 "${pension.name}"의 확정기간은 1년 이상이어야 합니다.`);
            }
            if ((pension.type === "db" || pension.type === "national") && pension.monthlyPayout !== undefined && pension.monthlyPayout < 0) {
                pushError(warnings, "additionalPensions", `연금 "${pension.name}"의 월 수령액은 0 이상이어야 합니다.`);
            }
        });
    }

    if (input.businessIncome && input.businessIncome.length > 0) {
        input.businessIncome.forEach((biz) => {
            if (biz.startAge >= biz.endAge) {
                pushError(warnings, "businessIncome", `사업소득 "${biz.name}"의 시작 나이가 종료 나이보다 크거나 같습니다.`);
            }
            if (biz.monthlyIncome < 0) {
                pushError(warnings, "businessIncome", `사업소득 "${biz.name}"의 월 소득이 음수입니다.`);
            }
            requireFinite(warnings, "businessIncome", `사업소득 "${biz.name}"의 성장률`, biz.growthRate);
            if (isFiniteNumber(biz.growthRate) && biz.growthRate <= -1) {
                pushError(warnings, "businessIncome", `사업소득 "${biz.name}"의 성장률은 -100%보다 커야 합니다.`);
            }
            if (biz.growthRate < -0.2) {
                pushWarning(warnings, "businessIncome", `사업소득 "${biz.name}"의 성장률(${(biz.growthRate * 100).toFixed(1)}%)이 지나치게 낮습니다.`);
            }
            if (biz.growthRate > 0.2) {
                pushWarning(warnings, "businessIncome", `사업소득 "${biz.name}"의 성장률(${(biz.growthRate * 100).toFixed(1)}%)이 높습니다.`);
            }
        });
    }

    if (input.withdrawal.strategy === "bucket") {
        if (!input.bucket) {
            pushError(warnings, "bucket", "버킷 전략 설정이 필요합니다.");
        } else if (!input.bucket.shortTermYears || input.bucket.shortTermYears < 1) {
            pushError(warnings, "bucket", "버킷 전략의 단기 버킷 기간이 설정되지 않았습니다.");
        } else if (!input.bucket.midTermYears || input.bucket.midTermYears < 1) {
            pushError(warnings, "bucket", "버킷 전략의 중기 버킷 기간이 설정되지 않았습니다.");
        }
    }

    if (input.withdrawal.strategy === "guardrails" && input.guardrails) {
        if (input.guardrails.upperThreshold <= input.guardrails.lowerThreshold) {
            pushError(warnings, "guardrails", "가드레일 상한선은 하한선보다 커야 합니다.");
        }
    }

    if (input.reverse_annuity?.enabled) {
        if (input.reverse_annuity.startAge < 55) {
            pushWarning(warnings, "reverse_annuity", "주택연금 가입 가능 연령은 보통 55세 이상입니다.");
        }
        if (input.reverse_annuity.monthlyPayment <= 0) {
            pushError(warnings, "reverse_annuity", "주택연금 월 수령액은 0보다 커야 합니다.");
        }
        if (input.reverse_annuity.houseValue <= 0) {
            pushError(warnings, "reverse_annuity", "주택연금 대상 주택 가치는 0보다 커야 합니다.");
        }
    }

    if (input.stress_test?.enabled) {
        if (input.stress_test.annualDeclineRate <= 0) {
            pushError(warnings, "stress_test", "스트레스 테스트 연간 하락률은 0보다 커야 합니다.");
        }
        if (input.stress_test.annualDeclineRate >= 1) {
            pushError(warnings, "stress_test", "스트레스 테스트 연간 하락률은 100% 미만이어야 합니다.");
        }
        if (input.stress_test.annualDeclineRate > 0.5) {
            pushWarning(warnings, "stress_test", "연간 50% 이상의 하락률은 극단적인 시나리오입니다.");
        }
        if (input.stress_test.durationMonths <= 0) {
            pushError(warnings, "stress_test", "스트레스 테스트 기간은 1개월 이상이어야 합니다.");
        }
        if (input.stress_test.durationMonths > 60) {
            pushInfo(warnings, "stress_test", "5년 이상의 지속적 폭락은 매우 드문 시나리오입니다.");
        }
    }

    if (input.inflation_scenario) {
        requireFinite(warnings, "inflation_scenario.baseRate", "인플레이션 시나리오 기본 물가상승률", input.inflation_scenario.baseRate);
        if (isFiniteNumber(input.inflation_scenario.baseRate) && input.inflation_scenario.baseRate <= -1) {
            pushError(warnings, "inflation_scenario.baseRate", "인플레이션 시나리오 기본 물가상승률은 -100%보다 커야 합니다.");
        }
        if (input.inflation_scenario.spikeRate !== undefined) {
            requireFinite(warnings, "inflation_scenario.spikeRate", "인플레이션 시나리오 급등 물가상승률", input.inflation_scenario.spikeRate);
            if (isFiniteNumber(input.inflation_scenario.spikeRate) && input.inflation_scenario.spikeRate <= -1) {
                pushError(warnings, "inflation_scenario.spikeRate", "인플레이션 시나리오 급등 물가상승률은 -100%보다 커야 합니다.");
            }
        }
    }

    if (input.severance?.enabled && input.severance.estimatedAmount < 0) {
        pushError(warnings, "severance", "예상 퇴직금은 0보다 커야 합니다.");
    }

    if (input.labor_income?.enabled) {
        requireRatio(warnings, "labor_income.currentSavingsRate", "현재 저축률", input.labor_income.currentSavingsRate);
        if (input.labor_income.currentNetMonthlyIncome < 0) {
            pushError(warnings, "labor_income.currentNetMonthlyIncome", "월 소득은 0 이상이어야 합니다.");
        }
        (input.labor_income.events || []).forEach((event, idx) => {
            if (event.age < input.current_age || event.age >= input.retire_age) {
                pushWarning(warnings, "labor_income.events", `소득 이벤트 ${idx + 1}의 나이가 현재~은퇴 사이여야 합니다.`);
            }
            if (event.savingsRate < 0 || event.savingsRate > 1) {
                pushError(warnings, "labor_income.events", `소득 이벤트 ${idx + 1}의 저축률이 유효하지 않습니다.`);
            }
        });
    }

    if (input.tax_credit?.enabled) {
        if (input.tax_credit.pensionSavingsContribution < 0) {
            pushError(warnings, "tax_credit", "연금저축 납입액은 0 이상이어야 합니다.");
        }
        if (input.tax_credit.irpContribution < 0) {
            pushError(warnings, "tax_credit", "IRP 납입액은 0 이상이어야 합니다.");
        }
        if (input.tax_credit.mode === "manual") {
            const manualRate = input.tax_credit.creditRate ?? -1;
            if (manualRate < 0 || manualRate > 1) {
                pushError(warnings, "tax_credit", "수동 세액공제율은 0%~100% 사이여야 합니다.");
            }
        }
        if (input.tax_credit.mode !== "manual" && input.tax_credit.mode !== "law_2026") {
            pushError(warnings, "tax_credit", "세액공제 모드가 유효하지 않습니다.");
        }
        if (input.tax_credit.lawYear !== 2026) {
            pushWarning(warnings, "tax_credit", "세액공제 법령 연도는 2026으로 고정됩니다.");
        }
        if (input.tax_credit.incomeBasis !== "simulated_taxable_income") {
            pushWarning(warnings, "tax_credit", "세액공제 소득 기준은 시뮬레이션 과세소득으로 고정됩니다.");
        }
    }

    if (input.rebalancing?.enabled) {
        if (input.rebalancing.tradingCostPercent && input.rebalancing.tradingCostPercent > 0.02) {
            pushWarning(warnings, "rebalancing", "거래 비용이 2% 이상입니다. 실제 비용을 확인해주세요.");
        }
        if (input.rebalancing.frequency === "threshold") {
            const threshold = input.rebalancing.thresholdPercent ?? 0;
            if (threshold <= 0 || threshold >= 1) {
                pushError(warnings, "rebalancing", "임계값 기반 리밸런싱은 0%~100% 사이 값이 필요합니다.");
            }
        }
        if (input.rebalancing.thresholdPercent && input.rebalancing.thresholdPercent > 0.20) {
            pushInfo(warnings, "rebalancing", "임계값이 20% 이상이면 리밸런싱 효과가 미미합니다.");
        }
    }

    if (input.simulation_settings.mode === "historical") {
        const historicalRange = getHistoricalYearRange();
        const year = input.simulation_settings.historical_start_year || historicalRange.startYear;
        if (year < historicalRange.startYear || year > historicalRange.endYear) {
            pushError(
                warnings,
                "simulation_settings",
                `역사적 데이터는 ${historicalRange.startYear}~${historicalRange.endYear}년 시작만 지원됩니다.`
            );
        }
    }

    if (input.housing_status === "rent" && input.realEstate && input.realEstate.some((asset) => asset.type === "residential")) {
        pushInfo(warnings, "housing_status", "주거 상태가 월세인데 주거용 부동산 자산이 함께 입력되어 있습니다.");
    }
}
