import { SimulationInput, ValidationWarning } from "./types";

export function validateSimulationInput(input: SimulationInput): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Age validations
    if (input.current_age > input.retire_age) {
        warnings.push({ field: 'retire_age', message: '은퇴 나이는 현재 나이와 같거나 커야 합니다.', severity: 'error' });
    }
    if (input.current_age === input.retire_age) {
        warnings.push({ field: 'retire_age', message: '현재 시점 은퇴로 계산됩니다.', severity: 'info' });
    }
    if (input.end_age <= input.current_age) {
        warnings.push({ field: 'end_age', message: '종료 나이는 현재 나이보다 커야 합니다.', severity: 'error' });
    }
    if (input.retire_age >= input.end_age) {
        warnings.push({ field: 'end_age', message: '종료 나이는 은퇴 나이보다 커야 합니다.', severity: 'error' });
    }
    if (input.end_age > 120) {
        warnings.push({ field: 'end_age', message: '종료 나이가 너무 높습니다 (120세 이하 권장).', severity: 'warning' });
    }

    // Simulation settings validation
    if (!Number.isFinite(input.simulation_settings.mc_paths) || !Number.isInteger(input.simulation_settings.mc_paths)) {
        warnings.push({ field: 'simulation_settings', message: '시뮬레이션 횟수는 정수여야 합니다.', severity: 'error' });
    } else if (input.simulation_settings.mc_paths < 1) {
        warnings.push({ field: 'simulation_settings', message: '시뮬레이션 횟수는 1 이상이어야 합니다.', severity: 'error' });
    } else if (input.simulation_settings.mc_paths > 20000) {
        warnings.push({ field: 'simulation_settings', message: '시뮬레이션 횟수가 매우 큽니다. 성능 저하 가능성이 있습니다.', severity: 'warning' });
    }

    // Portfolio validations
    if (!input.portfolio.assetClasses || input.portfolio.assetClasses.length === 0) {
        warnings.push({ field: 'portfolio', message: '포트폴리오에 최소 하나의 자산군이 포함되어야 합니다.', severity: 'error' });
    } else {
        const totalAlloc = input.portfolio.assetClasses.reduce((sum, a) => sum + a.allocation, 0);
        if (Math.abs(totalAlloc - 1.0) > 0.01) {
            warnings.push({ field: 'portfolio', message: `포트폴리오 비중 합계가 ${(totalAlloc * 100).toFixed(0)}%입니다. 100%가 되어야 합니다.`, severity: 'error' });
        }

        const rho = input.portfolio.manualCorrelation ?? 1;
        if (!Number.isFinite(rho) || rho < -1 || rho > 1) {
            warnings.push({ field: 'portfolio', message: '상관계수는 -1 ~ 1 범위여야 합니다.', severity: 'error' });
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
                warnings.push({ field: 'portfolio', message: '현재 상관계수/변동성 조합은 유효한 공분산 행렬이 아닐 수 있습니다.', severity: 'error' });
            }
        }
    }

    // Withdrawal rate warning
    if ((input.withdrawal.initialSafeRate || 0) > 0.06) {
        warnings.push({ field: 'withdrawal', message: '인출률이 6% 이상이면 자산 고갈 위험이 높습니다.', severity: 'warning' });
    }

    // Inflation warning
    if (input.annual_inflation > 0.05) {
        warnings.push({ field: 'inflation', message: '물가상승률이 5% 이상입니다. 지속적인 고인플레 상황을 가정하고 있습니다.', severity: 'info' });
    }

    // Real Estate validations
    if (input.realEstate && input.realEstate.length > 0) {
        input.realEstate.forEach((re, idx) => {
            if (re.currentValue < 0) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 가치가 음수입니다.`, severity: 'error' });
            }
            if (re.growthRate < -0.2) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 성장률(${(re.growthRate * 100).toFixed(1)}%)이 지나치게 낮습니다.`, severity: 'warning' });
            }
            if (re.growthRate > 0.2) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 성장률(${(re.growthRate * 100).toFixed(1)}%)이 비정상적으로 높습니다.`, severity: 'warning' });
            }
            if (re.rentalYield < 0) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 임대 수익률은 0 이상이어야 합니다.`, severity: 'error' });
            }
            if (re.rentalYield > 0.1) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 임대 수익률(${(re.rentalYield * 100).toFixed(1)}%)이 비정상적으로 높습니다.`, severity: 'warning' });
            }
            if (re.managementCost < 0) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 관리 비용률은 0 이상이어야 합니다.`, severity: 'error' });
            }
            if (re.managementCost > 0.1) {
                warnings.push({ field: 'realEstate', message: `부동산 "${re.name}"의 관리 비용률(${(re.managementCost * 100).toFixed(1)}%)이 높습니다.`, severity: 'warning' });
            }
        });
    }

    // Additional Pensions validations
    if (input.additionalPensions && input.additionalPensions.length > 0) {
        input.additionalPensions.forEach((pension) => {
            if (pension.currentValue < 0) {
                warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 현재 가치는 0 이상이어야 합니다.`, severity: 'error' });
            }
            if (pension.monthlyContribution < 0) {
                warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 월 납입액은 0 이상이어야 합니다.`, severity: 'error' });
            }
            if (pension.startAge < input.retire_age) {
                warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 수령 시작 나이(${pension.startAge}세)가 은퇴 나이보다 빠릅니다.`, severity: 'info' });
            }
            if (pension.startAge > input.end_age) {
                warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 수령 시작 나이(${pension.startAge}세)가 시뮬레이션 종료 나이보다 늦습니다.`, severity: 'warning' });
            }
            if ((pension.type === 'personal' || pension.type === 'dc') && pension.expectedReturn !== undefined) {
                if (pension.expectedReturn < -0.2 || pension.expectedReturn > 0.2) {
                    warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 기대수익률(${(pension.expectedReturn * 100).toFixed(1)}%) 범위를 확인해주세요.`, severity: 'warning' });
                }
            }
            if (pension.payoutType === 'fixed_period') {
                if (!pension.payoutYears || pension.payoutYears < 1) {
                    warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 확정기간은 1년 이상이어야 합니다.`, severity: 'error' });
                }
            }
            if ((pension.type === 'db' || pension.type === 'national') && pension.monthlyPayout !== undefined && pension.monthlyPayout < 0) {
                warnings.push({ field: 'additionalPensions', message: `연금 "${pension.name}"의 월 수령액은 0 이상이어야 합니다.`, severity: 'error' });
            }
        });
    }

    // Business Income validations
    if (input.businessIncome && input.businessIncome.length > 0) {
        input.businessIncome.forEach((biz) => {
            if (biz.startAge >= biz.endAge) {
                warnings.push({ field: 'businessIncome', message: `사업소득 "${biz.name}"의 시작 나이가 종료 나이보다 크거나 같습니다.`, severity: 'error' });
            }
            if (biz.monthlyIncome < 0) {
                warnings.push({ field: 'businessIncome', message: `사업소득 "${biz.name}"의 월 소득이 음수입니다.`, severity: 'error' });
            }
            if (biz.growthRate < -0.2) {
                warnings.push({ field: 'businessIncome', message: `사업소득 "${biz.name}"의 성장률(${(biz.growthRate * 100).toFixed(1)}%)이 지나치게 낮습니다.`, severity: 'warning' });
            }
            if (biz.growthRate > 0.2) {
                warnings.push({ field: 'businessIncome', message: `사업소득 "${biz.name}"의 성장률(${(biz.growthRate * 100).toFixed(1)}%)이 높습니다.`, severity: 'warning' });
            }
        });
    }

    // Bucket strategy validations
    if (input.withdrawal.strategy === 'bucket') {
        if (!input.bucket) {
            warnings.push({ field: 'bucket', message: 'Bucket 전략 설정이 필요합니다.', severity: 'error' });
        } else if (!input.bucket.shortTermYears || input.bucket.shortTermYears < 1) {
            warnings.push({ field: 'bucket', message: 'Bucket 전략의 단기 버킷 기간이 설정되지 않았습니다.', severity: 'error' });
        } else if (!input.bucket.midTermYears || input.bucket.midTermYears < 1) {
            warnings.push({ field: 'bucket', message: 'Bucket 전략의 중기 버킷 기간이 설정되지 않았습니다.', severity: 'error' });
        }
    }

    // National Pension start age validation
    if (input.national_pension.startAge) {
        if (input.national_pension.startAge < 60 || input.national_pension.startAge > 70) {
            warnings.push({ field: 'national_pension', message: '국민연금 수령 개시 연령은 60~70세 사이여야 합니다.', severity: 'warning' });
        }
    }

    // Guardrails validation
    if (input.withdrawal.strategy === 'guardrails' && input.guardrails) {
        if (input.guardrails.upperThreshold <= input.guardrails.lowerThreshold) {
            warnings.push({ field: 'guardrails', message: 'Guardrails 상한선은 하한선보다 커야 합니다.', severity: 'error' });
        }
    }

    // Reverse Annuity validation
    if (input.reverse_annuity?.enabled) {
        if (input.reverse_annuity.startAge < 55) {
            warnings.push({ field: 'reverse_annuity', message: '주택연금 가입 가능 연령은 보통 55세 이상입니다.', severity: 'warning' });
        }
        if (input.reverse_annuity.monthlyPayment <= 0) {
            warnings.push({ field: 'reverse_annuity', message: '주택연금 월 수령액은 0보다 커야 합니다.', severity: 'error' });
        }
        if (input.reverse_annuity.houseValue <= 0) {
            warnings.push({ field: 'reverse_annuity', message: '주택연금 대상 주택 가치는 0보다 커야 합니다.', severity: 'error' });
        }
    }

    // Stress Test validation
    if (input.stress_test?.enabled) {
        if (input.stress_test.annualDeclineRate <= 0) {
            warnings.push({ field: 'stress_test', message: '스트레스 테스트 연간 하락률은 0보다 커야 합니다.', severity: 'error' });
        }
        if (input.stress_test.annualDeclineRate > 0.5) {
            warnings.push({ field: 'stress_test', message: '연간 50% 이상의 하락률은 극단적인 시나리오입니다.', severity: 'warning' });
        }
        if (input.stress_test.durationMonths <= 0) {
            warnings.push({ field: 'stress_test', message: '스트레스 테스트 기간은 1개월 이상이어야 합니다.', severity: 'error' });
        }
        if (input.stress_test.durationMonths > 60) {
            warnings.push({ field: 'stress_test', message: '5년 이상의 지속적 폭락은 매우 드문 시나리오입니다.', severity: 'info' });
        }
    }

    // Portfolio asset return/volatility reasonableness
    input.portfolio.assetClasses.forEach((asset) => {
        if (asset.expectedAnnualReturn > 0.20) {
            warnings.push({ field: 'portfolio', message: `"${asset.name}"의 기대 수익률(${(asset.expectedAnnualReturn * 100).toFixed(1)}%)이 비현실적으로 높습니다.`, severity: 'warning' });
        }
        if (asset.expectedAnnualReturn < -0.05) {
            warnings.push({ field: 'portfolio', message: `"${asset.name}"의 기대 수익률이 음수입니다. 장기 투자 시 주의가 필요합니다.`, severity: 'info' });
        }
        if (asset.annualVolatility > 0.50) {
            warnings.push({ field: 'portfolio', message: `"${asset.name}"의 변동성(${(asset.annualVolatility * 100).toFixed(1)}%)이 매우 높습니다.`, severity: 'warning' });
        }
        if (asset.annualVolatility < 0) {
            warnings.push({ field: 'portfolio', message: `"${asset.name}"의 변동성은 0 이상이어야 합니다.`, severity: 'error' });
        }
    });

    // Severance validation
    if (input.severance?.enabled) {
        if (input.severance.estimatedAmount < 0) {
            warnings.push({ field: 'severance', message: '예상 퇴직금은 0보다 커야 합니다.', severity: 'error' });
        }
    }

    // Labor Income validations
    if (input.labor_income?.enabled) {
        if (input.labor_income.currentSavingsRate < 0 || input.labor_income.currentSavingsRate > 1) {
            warnings.push({ field: 'labor_income', message: '저축률은 0%~100% 사이여야 합니다.', severity: 'error' });
        }
        if (input.labor_income.currentNetMonthlyIncome < 0) {
            warnings.push({ field: 'labor_income', message: '월 소득은 0 이상이어야 합니다.', severity: 'error' });
        }
        (input.labor_income.events || []).forEach((event, idx) => {
            if (event.age < input.current_age || event.age >= input.retire_age) {
                warnings.push({ field: 'labor_income', message: `소득 이벤트 ${idx + 1}의 나이가 현재~은퇴 사이여야 합니다.`, severity: 'warning' });
            }
            if (event.savingsRate < 0 || event.savingsRate > 1) {
                warnings.push({ field: 'labor_income', message: `소득 이벤트 ${idx + 1}의 저축률이 유효하지 않습니다.`, severity: 'error' });
            }
        });
    }

    // Tax Credit validation
    if (input.tax_credit?.enabled) {
        if (input.tax_credit.pensionSavingsContribution < 0) {
            warnings.push({ field: 'tax_credit', message: '연금저축 납입액은 0 이상이어야 합니다.', severity: 'error' });
        }
        if (input.tax_credit.irpContribution < 0) {
            warnings.push({ field: 'tax_credit', message: 'IRP 납입액은 0 이상이어야 합니다.', severity: 'error' });
        }
        if (input.tax_credit.mode === 'manual') {
            const manualRate = input.tax_credit.creditRate ?? -1;
            if (manualRate < 0 || manualRate > 1) {
                warnings.push({ field: 'tax_credit', message: '수동 세액공제율은 0%~100% 사이여야 합니다.', severity: 'error' });
            }
        }
        if (input.tax_credit.mode !== 'manual' && input.tax_credit.mode !== 'law_2026') {
            warnings.push({ field: 'tax_credit', message: '세액공제 모드가 유효하지 않습니다.', severity: 'error' });
        }
        if (input.tax_credit.lawYear !== 2026) {
            warnings.push({ field: 'tax_credit', message: '세액공제 법령 연도는 2026으로 고정됩니다.', severity: 'warning' });
        }
        if (input.tax_credit.incomeBasis !== 'simulated_taxable_income') {
            warnings.push({ field: 'tax_credit', message: '세액공제 소득 기준은 시뮬레이션 과세소득으로 고정됩니다.', severity: 'warning' });
        }
    }

    // Rebalancing validation (Phase 7)
    if (input.rebalancing?.enabled) {
        if (input.rebalancing.tradingCostPercent && input.rebalancing.tradingCostPercent > 0.02) {
            warnings.push({ field: 'rebalancing', message: '거래 비용이 2% 이상입니다. 실제 비용을 확인해주세요.', severity: 'warning' });
        }
        if (input.rebalancing.frequency === 'threshold') {
            const threshold = input.rebalancing.thresholdPercent ?? 0;
            if (threshold <= 0 || threshold >= 1) {
                warnings.push({ field: 'rebalancing', message: '임계값 기반 리밸런싱은 0%~100% 사이 값이 필요합니다.', severity: 'error' });
            }
        }
        if (input.rebalancing.thresholdPercent && input.rebalancing.thresholdPercent > 0.20) {
            warnings.push({ field: 'rebalancing', message: '임계값이 20% 이상이면 리밸런싱 효과가 미미합니다.', severity: 'info' });
        }
    }

    // Historical mode validation (Phase 7)
    if (input.simulation_settings.mode === 'historical') {
        const year = input.simulation_settings.historical_start_year || 1985;
        if (year < 1985 || year > 2024) {
            warnings.push({ field: 'simulation_settings', message: '역사적 데이터는 1985~2024년 시작만 지원됩니다.', severity: 'error' });
        }
    }

    return warnings;
}
