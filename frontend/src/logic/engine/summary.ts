import { clampHistoricalStartYear, getHistoricalYearRange } from "../historicalData";
import { calculateAnnualPensionTaxCredit, createRuleMetadata } from "../rules/kr";
import type { SimulationInput, SimulationSummary } from "../types";

export function calculateAnnualTaxCredit(input: SimulationInput, annualTaxableIncome: number): number {
    const taxCredit = input.tax_credit;
    if (!taxCredit?.enabled) {
        return 0;
    }

    return calculateAnnualPensionTaxCredit(
        taxCredit.pensionSavingsContribution,
        taxCredit.irpContribution,
        annualTaxableIncome,
        taxCredit.creditRate,
        taxCredit.mode === "manual",
        input.rule_set
    );
}

export function buildAssumptionWarnings(input: SimulationInput): SimulationSummary["assumptionWarnings"] {
    const historicalRange = getHistoricalYearRange();
    const warnings: SimulationSummary["assumptionWarnings"] = [
        {
            code: "local_rule_set",
            severity: "info",
            message: "계산에는 로컬 규칙 세트와 로컬 역사 데이터가 사용됩니다."
        }
    ];

    if (!input.health_insurance?.enabled) {
        warnings.push({
            code: "health_insurance_disabled",
            severity: "warning",
            message: "건강보험료가 비활성화되어 실제 순현금흐름보다 낙관적일 수 있습니다."
        });
    }

    if ((input.withdrawal.taxStrategy ?? "simple") !== "detailed") {
        warnings.push({
            code: "simple_tax_mode",
            severity: "warning",
            message: "세금이 단일 세율로 계산되어 실제 세후 현금흐름과 차이가 날 수 있습니다."
        });
    }

    if (input.national_pension.expected_monthly_benefit_at_retirement > 0) {
        warnings.push({
            code: "manual_pension_input",
            severity: "info",
            message: "국민연금은 사용자 입력 추정치 기반으로 계산됩니다."
        });
    }

    if (input.withdrawal.strategy === "bucket") {
        warnings.push({
            code: "bucket_strategy_approximate",
            severity: "warning",
            message: "버킷 전략은 현재 계좌별 실버킷 잔고 대신 근사 로직으로 계산됩니다."
        });
    }

    if (input.rebalancing?.enabled && input.rebalancing.taxEfficient) {
        warnings.push({
            code: "tax_efficient_rebalancing_approximate",
            severity: "info",
            message: "세금효율 리밸런싱은 신규 유입 우선 근사 모델을 사용합니다."
        });
    }

    if (input.longevity_risk?.useDistribution) {
        warnings.push({
            code: "manual_longevity_model",
            severity: "warning",
            message: "장수 리스크는 사용자 입력 기대수명 분포를 사용합니다. 공식 생명표 대체값이 아닙니다."
        });
    }

    if (input.simulation_settings.mode === "historical") {
        const requestedStartYear = input.simulation_settings.historical_start_year ?? historicalRange.startYear;
        warnings.push({
            code: "historical_snapshot_range",
            severity: "info",
            message: `역사적 백테스트는 로컬 스냅샷 ${historicalRange.startYear}-${historicalRange.endYear} 구간을 사용합니다.`
        });

        if (requestedStartYear !== clampHistoricalStartYear(requestedStartYear)) {
            warnings.push({
                code: "historical_start_year_clamped",
                severity: "warning",
                message: "선택한 역사적 시작 연도가 데이터 범위를 벗어나 로컬 데이터 시작/종료 연도로 보정됩니다."
            });
        }
    }

    return warnings;
}

export function buildSurvivalStats(
    survivalSeries?: { age: number[]; survivalRate: number[] }
): SimulationSummary["survivalStats"] {
    if (!survivalSeries || survivalSeries.age.length === 0 || survivalSeries.survivalRate.length === 0) {
        return {
            finalSurvivalRate: 100,
            lowestSurvivalRate: 100,
            firstBelowHundredPercentAge: null
        };
    }

    let lowestSurvivalRate = 100;
    let firstBelowHundredPercentAge: number | null = null;

    for (let i = 0; i < survivalSeries.survivalRate.length; i++) {
        const rate = survivalSeries.survivalRate[i];
        if (rate < lowestSurvivalRate) {
            lowestSurvivalRate = rate;
        }
        if (firstBelowHundredPercentAge === null && rate < 100) {
            firstBelowHundredPercentAge = survivalSeries.age[i];
        }
    }

    return {
        finalSurvivalRate: survivalSeries.survivalRate[survivalSeries.survivalRate.length - 1],
        lowestSurvivalRate,
        firstBelowHundredPercentAge
    };
}

export function buildSurvivalStatsFromDepletionMonths(
    totalMonths: number,
    currentAge: number,
    firstDepletionMonthByPath: ArrayLike<number>,
    totalPaths: number
): SimulationSummary["survivalStats"] {
    if (totalPaths <= 0 || totalMonths <= 0) {
        return {
            finalSurvivalRate: 100,
            lowestSurvivalRate: 100,
            firstBelowHundredPercentAge: null
        };
    }

    let finalAliveCount = 0;
    let lowestSurvivalRate = 100;
    let firstBelowHundredPercentAge: number | null = null;

    for (let month = 0; month < totalMonths; month++) {
        let aliveCount = 0;
        for (let path = 0; path < firstDepletionMonthByPath.length; path++) {
            const depletionMonth = firstDepletionMonthByPath[path];
            if (depletionMonth < 0 || depletionMonth > month) {
                aliveCount++;
            }
        }

        if (month === totalMonths - 1) {
            finalAliveCount = aliveCount;
        }

        const survivalRate = (aliveCount / Math.max(1, totalPaths)) * 100;
        if (survivalRate < lowestSurvivalRate) {
            lowestSurvivalRate = survivalRate;
        }
        if (firstBelowHundredPercentAge === null && survivalRate < 100) {
            firstBelowHundredPercentAge = Math.floor(currentAge + month / 12);
        }
    }

    return {
        finalSurvivalRate: (finalAliveCount / Math.max(1, totalPaths)) * 100,
        lowestSurvivalRate,
        firstBelowHundredPercentAge
    };
}

export function buildSurvivalSeriesFromDepletionMonths(
    totalMonths: number,
    currentAge: number,
    firstDepletionMonthByPath: Int32Array,
    totalPaths: number
) {
    const month: number[] = [];
    const age: number[] = [];
    const survivalRate: number[] = [];

    for (let currentMonth = 0; currentMonth < totalMonths; currentMonth++) {
        let aliveCount = 0;
        for (let path = 0; path < firstDepletionMonthByPath.length; path++) {
            const depletionMonth = firstDepletionMonthByPath[path];
            if (depletionMonth < 0 || depletionMonth > currentMonth) {
                aliveCount++;
            }
        }

        month.push(currentMonth);
        age.push(Math.floor(currentAge + currentMonth / 12));
        survivalRate.push((aliveCount / Math.max(1, totalPaths)) * 100);
    }

    return { month, age, survivalRate };
}

export function buildSummaryBase(
    input: SimulationInput,
    source: SimulationSummary["source"],
    calculationMode: SimulationSummary["calculationMode"],
    finalTotalAssets: number,
    finalTotalAssetsReal: number,
    retirementTotalAssets: number,
    retirementTotalAssetsReal: number,
    successRate: number,
    terminalStats: SimulationSummary["terminalStats"],
    depletionStats: SimulationSummary["depletionStats"],
    survivalStats: SimulationSummary["survivalStats"]
): Omit<SimulationSummary, "mc"> {
    return {
        retireAge: input.retire_age,
        endAge: input.end_age,
        source,
        calculationMode,
        ruleMetadata: createRuleMetadata(input.rule_set),
        assumptionWarnings: buildAssumptionWarnings(input),
        finalTotalAssets,
        finalTotalAssetsReal,
        retirementPoint: {
            age: input.retire_age,
            totalAssets: retirementTotalAssets,
            totalAssetsReal: retirementTotalAssetsReal
        },
        terminalStats,
        successRate,
        depletion: depletionStats,
        depletionStats,
        survivalStats
    };
}
