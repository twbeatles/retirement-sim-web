/**
 * Risk Analysis Module
 * Provides advanced risk analysis functions for retirement simulation
 */

import { type SimulationInput, type SimulationResult, type DepletionAnalysis, type SensitivityResult, type SoRRAnalysis } from './types';
import { runSimulation } from './engine';
import { percentile } from './math';
import { calculateRegionalHealthInsurance } from './koreaTax';
import { calculateAnnualPensionTaxCredit } from './rules/kr';

/**
 * Analyze when assets are depleted across Monte Carlo paths
 */
export function analyzeDepletion(result: SimulationResult): DepletionAnalysis | null {
    if (result.mode === 'deterministic') {
        return null;
    }

    const summaryDepletionAges = result.summary.depletion?.firstDepletionAgeByPath;
    const depletionAges: number[] = [];
    const histogramBuckets: { [key: string]: number } = {
        '60-64': 0,
        '65-69': 0,
        '70-74': 0,
        '75-79': 0,
        '80-84': 0,
        '85-89': 0,
        '90-94': 0,
        '95+': 0,
        'never': 0
    };

    if (summaryDepletionAges && summaryDepletionAges.length > 0) {
        for (const age of summaryDepletionAges) {
            if (age < 0) {
                depletionAges.push(-1);
                histogramBuckets['never']++;
                continue;
            }
            depletionAges.push(age);
            const bucket = Math.floor(age / 5) * 5;
            if (bucket < 60) histogramBuckets['60-64']++;
            else if (bucket >= 95) histogramBuckets['95+']++;
            else histogramBuckets[`${bucket}-${bucket + 4}`]++;
        }
    } else if (result.sampleTimelines) {
        // Fallback for legacy payloads.
        result.sampleTimelines.forEach((timeline) => {
            let depleted = false;
            for (const row of timeline) {
                if (row.totalAssets <= 0) {
                    depletionAges.push(row.age);
                    const bucket = Math.floor(row.age / 5) * 5;
                    if (bucket < 60) histogramBuckets['60-64']++;
                    else if (bucket >= 95) histogramBuckets['95+']++;
                    else histogramBuckets[`${bucket}-${bucket + 4}`]++;
                    depleted = true;
                    break;
                }
            }
            if (!depleted) {
                depletionAges.push(-1);
                histogramBuckets['never']++;
            }
        });
    } else {
        return null;
    }

    const depletedAges = depletionAges.filter(a => a > 0);
    const medianDepletionAge = depletedAges.length > 0 ? percentile(depletedAges, 50) : null;

    const total = Math.max(1, depletionAges.length);
    const histogram = Object.entries(histogramBuckets).map(([ageRange, count]) => ({
        ageRange,
        count,
        percentage: count / total
    }));

    return {
        depletionAges,
        histogram,
        medianDepletionAge,
        neverDepletedRate: histogramBuckets['never'] / total
    };
}

/**
 * Run sensitivity analysis on a parameter
 */
export function runSensitivityAnalysis(
    baseInput: SimulationInput,
    parameter: 'annual_return' | 'annual_inflation' | 'withdrawal_rate',
    variations: number[]
): SensitivityResult {
    const successRates: number[] = [];
    let baseValue = 0;

    // Get base value
    switch (parameter) {
        case 'annual_return':
            baseValue = baseInput.portfolio.assetClasses.reduce(
                (sum, a) => sum + a.expectedAnnualReturn * a.allocation, 0
            );
            break;
        case 'annual_inflation':
            baseValue = baseInput.inflation_scenario?.baseRate ?? baseInput.annual_inflation;
            break;
        case 'withdrawal_rate':
            baseValue = baseInput.withdrawal.initialSafeRate || 0.04;
            break;
    }

    for (const delta of variations) {
        const testInput = JSON.parse(JSON.stringify(baseInput)) as SimulationInput;

        switch (parameter) {
            case 'annual_return':
                // Adjust all asset returns proportionally
                testInput.portfolio.assetClasses = testInput.portfolio.assetClasses.map(a => ({
                    ...a,
                    expectedAnnualReturn: a.expectedAnnualReturn + delta
                }));
                break;
            case 'annual_inflation':
                testInput.annual_inflation = baseValue + delta;
                testInput.inflation_scenario = {
                    type: testInput.inflation_scenario?.type ?? 'custom',
                    baseRate: baseValue + delta,
                    spikeStartAge: testInput.inflation_scenario?.spikeStartAge,
                    spikeDurationYears: testInput.inflation_scenario?.spikeDurationYears,
                    spikeRate: testInput.inflation_scenario?.spikeRate
                };
                break;
            case 'withdrawal_rate':
                testInput.withdrawal.initialSafeRate = baseValue + delta;
                break;
        }

        // Run simulation with reduced paths for speed
        testInput.simulation_settings.mc_paths = Math.min(testInput.simulation_settings.mc_paths, 100);
        const result = runSimulation(testInput);
        successRates.push(result.summary.successRate);
    }

    return {
        parameter,
        baseValue,
        testValues: variations.map(v => baseValue + v),
        successRates
    };
}

/**
 * Analyze Sequence of Returns Risk
 */
export function analyzeSoRR(baseInput: SimulationInput): SoRRAnalysis {
    const scenarios: SoRRAnalysis['scenarios'] = [];

    // Scenario 1: Base case
    const baseResult = runSimulation(baseInput);
    scenarios.push({
        name: '기본 시나리오',
        successRate: baseResult.summary.successRate,
        finalAssetsMean: baseResult.summary.finalTotalAssetsReal
    });

    // Scenario 2: Bad returns in first 5 years of retirement
    const earlyBadInput = JSON.parse(JSON.stringify(baseInput)) as SimulationInput;
    earlyBadInput.stress_test = {
        enabled: true,
        startFromRetirement: true,
        durationMonths: 60, // 5 years
        annualDeclineRate: 0.15 // 15% decline
    };
    const earlyBadResult = runSimulation(earlyBadInput);
    scenarios.push({
        name: '은퇴 초 5년 폭락',
        successRate: earlyBadResult.summary.successRate,
        finalAssetsMean: earlyBadResult.summary.finalTotalAssetsReal
    });

    // Scenario 3: Bad returns late in retirement (less impact expected)
    // Simulate a crash 20 years after retirement (or at age 80)
    const lateBadInput = JSON.parse(JSON.stringify(baseInput)) as SimulationInput;
    const lateStartAge = Math.max(baseInput.retire_age + 20, 80);
    const lateCrashMonth = (lateStartAge - baseInput.current_age) * 12;

    // Add a significant one-time loss event (30% of estimated assets at that time)
    const estimatedAssetsAtLateAge = baseInput.general.current_balance * Math.pow(1.05, lateStartAge - baseInput.current_age);
    const crashAmount = -estimatedAssetsAtLateAge * 0.30; // 30% crash

    lateBadInput.events = [
        ...lateBadInput.events,
        { month_index: lateCrashMonth, amount: crashAmount, name: '후기 시장 폭락' }
    ];

    const lateResult = runSimulation(lateBadInput);
    scenarios.push({
        name: '은퇴 후 20년 이후 폭락',
        successRate: lateResult.summary.successRate,
        finalAssetsMean: lateResult.summary.finalTotalAssetsReal
    });

    return {
        earlyRetirementImpact: baseResult.summary.successRate - earlyBadResult.summary.successRate,
        lateRetirementImpact: baseResult.summary.successRate - lateResult.summary.successRate,
        scenarios
    };
}

/**
 * Calculate health insurance premium (Korean regional insured)
 * Simplified calculation based on 2024 rates
 */
export function calculateHealthInsurancePremium(
    monthlyIncome: number,
    assets: number
): number {
    return calculateRegionalHealthInsurance(monthlyIncome * 12, assets, 0);
}

/**
 * Calculate Korean reverse mortgage (주택연금) payment
 * Based on Korea Housing Finance Corporation (HF) guidelines
 */
export function calculateReverseAnnuityPayment(
    houseValue: number,
    startAge: number,
    _type: 'lifetime' | 'fixed_term' = 'lifetime'
): number {
    // Simplified calculation based on HF 2024 guidelines
    // Actual calculation is complex and varies by location, age, etc.

    // Loan limit rate by age (approximate)
    const loanLimitRates: { [key: number]: number } = {
        60: 0.35, 65: 0.40, 70: 0.47, 75: 0.55, 80: 0.65
    };

    const age = Math.min(80, Math.max(60, startAge));
    const ageKey = Math.floor(age / 5) * 5 as 60 | 65 | 70 | 75 | 80;
    const loanLimit = houseValue * (loanLimitRates[ageKey] || 0.40);

    // Convert to monthly payment (lifetime)
    // Assume average remaining life of 20-30 years after 65
    const expectedYears = 95 - age; // Conservative estimate
    const monthlyPayment = loanLimit / (expectedYears * 12) * 0.85; // 85% efficiency

    return Math.round(monthlyPayment);
}

/**
 * Calculate tax credit for pension savings (Korean)
 */
export function calculateTaxCredit(
    pensionSavingsContribution: number,
    irpContribution: number,
    totalIncome: number
): { creditAmount: number; effectiveCreditRate: number } {
    const creditAmount = calculateAnnualPensionTaxCredit(
        pensionSavingsContribution,
        irpContribution,
        totalIncome
    );
    const effectiveCreditRate = totalIncome <= 55000000 ? 0.165 : 0.132;

    return {
        creditAmount,
        effectiveCreditRate
    };
}

/**
 * Calculate Guardrails withdrawal adjustment
 */
export function calculateGuardrailsWithdrawal(
    currentAssets: number,
    initialWithdrawalAmount: number,
    currentWithdrawalAmount: number,
    baseRate: number,
    upperThreshold: number,
    lowerThreshold: number,
    adjustmentRate: number
): number {
    const currentRate = currentAssets > 0 ? currentWithdrawalAmount / currentAssets : 0;

    let newWithdrawalAmount = currentWithdrawalAmount;

    if (currentRate > upperThreshold) {
        // Asset growth is slow, reduce withdrawal
        newWithdrawalAmount = currentWithdrawalAmount * (1 - adjustmentRate);
    } else if (currentRate < lowerThreshold) {
        // Asset growth is strong, increase withdrawal
        newWithdrawalAmount = currentWithdrawalAmount * (1 + adjustmentRate);
    }

    // Apply floors (never go below 80% of initial or above 120%)
    const floor = initialWithdrawalAmount * 0.8;
    const ceiling = initialWithdrawalAmount * 1.2;

    return Math.max(floor, Math.min(newWithdrawalAmount, ceiling));
}
