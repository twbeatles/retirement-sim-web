/**
 * Core Simulation Engine
 * Optimized for performance:
 * - Pre-calculates invariants (portfolio metrics, events map) outside the loop.
 * - In Monte Carlo mode, stores only a subset of timelines to reduce memory pressure.
 */

import {
    SimulationInput,
    SimulationResult,
    SimulationRunOptions,
    TimelineRow,
    SimulationSummary,
    HistoricalAssetType,
} from "./types";
import {
    getHistoricalReturns,
    getHistoricalInflation,
    mapAssetClassToHistorical,
    annualToMonthlyReturns,
} from "./historicalData";
import {
    percentileSorted,
    meanTyped,
    monthlyRateFromAnnual,
    randomNormalArray,
    randomNormal,
    annuityPayment,
    calculateVPWRate,
    setSeed,
} from "./math";
import { calculateRegionalHealthInsurance } from "./koreaTax";

// Helper to calculate portfolio metrics
function calculatePortfolioMetrics(input: SimulationInput) {
    const assets = input.portfolio.assetClasses;

    // 1. Calculate Weighted Return (Mean)
    let weightedReturn = 0;
    let totalAlloc = 0;

    assets.forEach((a) => {
        weightedReturn += a.expectedAnnualReturn * a.allocation;
        totalAlloc += a.allocation;
    });

    if (totalAlloc > 0) {
        weightedReturn /= totalAlloc;
    }

    // 2. Calculate Portfolio Volatility
    // Method: sqrt(w' * Cov * w)
    // We assume a simplified correlation model where all assets share a single Correlation 'rho'
    // Cov(i,j) = rho * sigma_i * sigma_j
    // Var(P) = Sum(w_i^2 * sigma_i^2) + Sum_i!=j (w_i * w_j * rho * sigma_i * sigma_j)

    const rho = input.portfolio.manualCorrelation ?? 1.0; // Default to 1.0 (Worst case: No diversification benefit)

    let varianceSum = 0;

    for (let i = 0; i < assets.length; i++) {
        for (let j = 0; j < assets.length; j++) {
            const w_i = assets[i].allocation;
            const w_j = assets[j].allocation;
            const sig_i = assets[i].annualVolatility;
            const sig_j = assets[j].annualVolatility;

            if (i === j) {
                // Cov(i,i) = Var(i) = sigma_i^2
                varianceSum += w_i * w_j * sig_i * sig_j;
            } else {
                // Cov(i,j) = rho * sig_i * sig_j
                varianceSum += w_i * w_j * rho * sig_i * sig_j;
            }
        }
    }

    // NOTE: This calculation assumes "Constant Mix" (Continuous Rebalancing).
    // The portfolio is assumed to be constantly rebalanced to maintain these target weights.
    // Thus, the drift of asset weights is not simulated in the main stochastic process.
    // The "Rebalancing Cost" in simulateOnePath aims to capture the friction of this maintenance.

    // Normalize: If allocation is not 1.0, technically we should normalize weights.
    // Sim assumes "Cash" for unallocated portion with 0 return/0 vol? 
    // Usually UI enforces 100%. Let's normalize weights mathematically if total != 1.
    if (totalAlloc > 0 && Math.abs(totalAlloc - 1.0) > 0.001) {
        // Retrospective normalization. 
        // Variance is quadratic, so we divide by totalAlloc^2
        varianceSum /= (totalAlloc * totalAlloc);
    }

    const portfolioVol = Math.sqrt(Math.max(0, varianceSum));

    // Default to 0 if no assets
    return { mu: weightedReturn, sigma: portfolioVol };
}

// Optimization: Pre-calculated context to avoid re-computing per path

interface SimulationContext {
    mu_m: number;
    sig_m: number;
    r_private: number;
    infl_m: number;
    eventsMap: Map<number, number>;
    monthsToRetire: number;
    totalMonths: number;
    initialDebt: number;
    debtMonthlyRate: number;

    // New feature contexts
    inflationByMonth?: Float64Array;     // Dynamic inflation (for spike scenarios)
    // [MODIFIED] healthInsuranceBase removed, we prefer checking input.health_insurance directly or pre-calc logic
    // But for Simple Mode efficiency, we can keep using it or just use input.
    // Let's refine: Detailed Mode needs dynamic income, so it must be calculated inside loop.
    severanceMonth?: number;             // Month when severance is received
    severanceMonthlyPayout?: number;     // If annuity type
    reverseAnnuityStartMonth?: number;   // Month when reverse annuity starts
    reverseAnnuityPayment?: number;      // Monthly payment
    medicalShockMonths?: Map<number, number>; // month -> amount
    contributionByMonth?: Float64Array; // ADDED
    bucketState?: {
        shortTerm: number;
        midTerm: number;
        longTerm: number;
        lastRebalanceMonth: number;
    };

    // Phase 1: New Contexts
    businessIncomeByMonth?: Float64Array; // Aggregated business/rental income
    realEstateState?: {
        initialValues: number[];
        growthRates: number[];
        rentalYields: number[];
        managementCosts: number[];
    };
    pensionState?: {
        configs: any[]; // Store configs for reference in loop
        initialValues: number[];
        monthlyRates: number[]; // For DC growth
    };

    // VPW optimization: pre-calculated portfolio return
    annualPortfolioReturn?: number;
    annualInflation?: number;

    // Phase 7: Historical Returns (pre-computed monthly returns)
    historicalReturns?: Float64Array;
    historicalAssetReturns?: Float64Array[];
    historicalInflation?: Float64Array;

    // Phase 7: Rebalancing
    rebalanceMonths?: Set<number>; // Months when rebalancing occurs
    targetAllocations?: number[];  // Target allocation for each asset class
    tradingCostRate?: number;      // Trading cost as decimal
    thresholdPercent?: number;
    rebalancingFrequency?: NonNullable<SimulationInput["rebalancing"]>["frequency"];
    taxEfficientRebalance?: boolean;
    assetExpectedMonthlyReturns?: number[];
    assetMonthlyVolatility?: number[];
    correlation?: number;
}

type PathSimulationOptions = {
    captureTimeline?: boolean;
    trajectorySink?: Float64Array | null;
    trajectoryPathIndex?: number;
    trajectoryLength?: number;
};

type PathSimulationResult = {
    timeline: TimelineRow[];
    finalTotalAssets: number;
    finalTotalAssetsReal: number;
    retirementTotalAssets: number;
    retirementTotalAssetsReal: number;
    retirementAge: number;
    firstDepletionMonth: number;
    monthsSimulated: number;
};

const TAX_CREDIT_LAW_2026 = {
    lowIncomeThreshold: 55000000,
    lowRate: 0.165,
    highRate: 0.132,
    pensionLimit: 6000000,
    irpLimit: 3000000,
    totalLimit: 9000000
} as const;

function calculateAnnualTaxCredit(input: SimulationInput, annualTaxableIncome: number): number {
    const taxCredit = input.tax_credit;
    if (!taxCredit?.enabled) {
        return 0;
    }

    const eligiblePension = Math.min(
        Math.max(0, taxCredit.pensionSavingsContribution),
        TAX_CREDIT_LAW_2026.pensionLimit
    );
    const eligibleIRP = Math.min(
        Math.max(0, taxCredit.irpContribution),
        TAX_CREDIT_LAW_2026.irpLimit
    );
    const totalEligible = Math.min(
        eligiblePension + eligibleIRP,
        TAX_CREDIT_LAW_2026.totalLimit
    );

    const effectiveRate = taxCredit.mode === "manual"
        ? (taxCredit.creditRate ?? TAX_CREDIT_LAW_2026.highRate)
        : annualTaxableIncome <= TAX_CREDIT_LAW_2026.lowIncomeThreshold
            ? TAX_CREDIT_LAW_2026.lowRate
            : TAX_CREDIT_LAW_2026.highRate;

    return totalEligible * Math.max(0, effectiveRate);
}

function simulateOnePath(
    input: SimulationInput,
    ctx: SimulationContext,
    stochastic: boolean,
    historicalPathIndex?: number, // For historical mode: which rolling window
    runOptions: PathSimulationOptions = {}
): PathSimulationResult {
    const { current_age } = input;
    const { mu_m, sig_m, r_private, infl_m, eventsMap, monthsToRetire, totalMonths, initialDebt, debtMonthlyRate, contributionByMonth } = ctx;
    const captureTimeline = runOptions.captureTimeline ?? true;

    if (totalMonths <= 0) {
        return {
            timeline: [],
            finalTotalAssets: 0,
            finalTotalAssetsReal: 0,
            retirementTotalAssets: 0,
            retirementTotalAssetsReal: 0,
            retirementAge: input.retire_age,
            firstDepletionMonth: -1,
            monthsSimulated: 0
        };
    }

    const trajectorySink = runOptions.trajectorySink ?? null;
    const trajectoryPathIndex = runOptions.trajectoryPathIndex ?? -1;
    const trajectoryLength = runOptions.trajectoryLength ?? totalMonths;
    const trajectoryBaseOffset =
        trajectorySink && trajectoryPathIndex >= 0
            ? trajectoryPathIndex * trajectoryLength
            : -1;

    let r_general: number[] | Float64Array;

    const historicalOffset = historicalPathIndex !== undefined ? historicalPathIndex * 12 : 0;

    // Phase 7: Historical Mode - use actual historical returns
    if (ctx.historicalReturns && ctx.historicalReturns.length > 0 && historicalPathIndex !== undefined) {
        r_general = new Float64Array(totalMonths);
        for (let m = 0; m < totalMonths; m++) {
            const idx = (historicalOffset + m) % ctx.historicalReturns.length;
            r_general[m] = ctx.historicalReturns[idx];
        }
    } else if (stochastic) {
        r_general = randomNormalArray(totalMonths, mu_m, sig_m);
        if (input.stress_test?.enabled) {
            // Apply Stress Test: Override returns for a specific period
            const st = input.stress_test;
            const startM = st.startFromRetirement ? monthsToRetire : 0;
            const endM = Math.min(totalMonths, startM + st.durationMonths);

            // Calculate monthly stress rate: (1 - annualDecline)^(1/12) - 1
            // e.g. 20% decline => (0.8)^(1/12) - 1
            const factor = Math.pow(1 - st.annualDeclineRate, 1.0 / 12.0) - 1;

            for (let m = startM; m < endM; m++) {
                r_general[m] = factor;
            }
        }
    } else {
        r_general = new Float64Array(totalMonths).fill(mu_m);
    }

    // Initial State
    let balGeneral = input.general.current_balance;
    let balPrivate = input.private_pension.current_balance;
    let debt = initialDebt;

    const configuredAllocations = ctx.targetAllocations ?? input.portfolio.assetClasses.map((asset) => asset.allocation);
    const totalTargetAllocation = configuredAllocations.reduce((sum, weight) => sum + Math.max(0, weight), 0);
    const normalizedAllocations = configuredAllocations.map((weight) =>
        totalTargetAllocation > 0 ? Math.max(0, weight) / totalTargetAllocation : 0
    );
    const useAssetLevelTracking =
        Boolean(input.rebalancing?.enabled) &&
        totalTargetAllocation > 0 &&
        input.portfolio.assetClasses.length > 0 &&
        normalizedAllocations.length === input.portfolio.assetClasses.length;
    let assetBalances: Float64Array | null = null;
    if (useAssetLevelTracking) {
        assetBalances = new Float64Array(normalizedAllocations.length);
        for (let i = 0; i < normalizedAllocations.length; i++) {
            assetBalances[i] = Math.max(0, balGeneral * normalizedAllocations[i]);
        }
        balGeneral = assetBalances.reduce((sum, value) => sum + value, 0);
    }

    const syncGeneralFromAssets = () => {
        if (!assetBalances) return;
        let sum = 0;
        for (let i = 0; i < assetBalances.length; i++) {
            sum += assetBalances[i];
        }
        balGeneral = Math.max(0, sum);
    };

    const applyGeneralDelta = (delta: number, prioritizeUnderweightBuys = false) => {
        if (!assetBalances) {
            balGeneral = Math.max(0, balGeneral + delta);
            return;
        }

        if (Math.abs(delta) < 1e-9) {
            return;
        }

        if (delta > 0) {
            const totalBefore = assetBalances.reduce((sum, value) => sum + value, 0);
            const totalAfter = totalBefore + delta;
            let remaining = delta;

            if (prioritizeUnderweightBuys && totalAfter > 0) {
                const deficits = new Float64Array(assetBalances.length);
                let deficitSum = 0;
                for (let i = 0; i < assetBalances.length; i++) {
                    const targetValue = totalAfter * normalizedAllocations[i];
                    const deficit = Math.max(0, targetValue - assetBalances[i]);
                    deficits[i] = deficit;
                    deficitSum += deficit;
                }
                if (deficitSum > 0) {
                    const allocatable = Math.min(remaining, deficitSum);
                    for (let i = 0; i < assetBalances.length; i++) {
                        if (deficits[i] <= 0) continue;
                        assetBalances[i] += allocatable * (deficits[i] / deficitSum);
                    }
                    remaining -= allocatable;
                }
            }

            if (remaining > 0) {
                for (let i = 0; i < assetBalances.length; i++) {
                    assetBalances[i] += remaining * normalizedAllocations[i];
                }
            }
        } else {
            let remainingWithdrawal = Math.abs(delta);
            while (remainingWithdrawal > 1e-6) {
                const total = assetBalances.reduce((sum, value) => sum + value, 0);
                if (total <= 0) {
                    break;
                }
                let deducted = 0;
                for (let i = 0; i < assetBalances.length; i++) {
                    const share = assetBalances[i] / total;
                    const cut = Math.min(assetBalances[i], remainingWithdrawal * share);
                    assetBalances[i] -= cut;
                    deducted += cut;
                }
                if (deducted <= 1e-9) break;
                remainingWithdrawal -= deducted;
            }
        }

        syncGeneralFromAssets();
    };

    const computeMaxDrift = () => {
        if (!assetBalances || balGeneral <= 0) return 0;
        let maxDrift = 0;
        for (let i = 0; i < assetBalances.length; i++) {
            const currentWeight = assetBalances[i] / balGeneral;
            const drift = Math.abs(currentWeight - normalizedAllocations[i]);
            if (drift > maxDrift) {
                maxDrift = drift;
            }
        }
        return maxDrift;
    };

    const rebalanceToTargets = (allowSell: boolean) => {
        if (!assetBalances) return 0;
        syncGeneralFromAssets();
        if (balGeneral <= 0) return 0;

        const targetValues = normalizedAllocations.map((weight) => balGeneral * weight);
        const beforeBalances = Float64Array.from(assetBalances);
        let turnoverAmount = 0;

        if (allowSell) {
            for (let i = 0; i < assetBalances.length; i++) {
                const diff = targetValues[i] - assetBalances[i];
                turnoverAmount += Math.abs(diff);
                assetBalances[i] = targetValues[i];
            }
            turnoverAmount *= 0.5;
        } else {
            let availableBuyBudget = 0;
            const deficits = new Float64Array(assetBalances.length);
            for (let i = 0; i < assetBalances.length; i++) {
                const diff = targetValues[i] - assetBalances[i];
                if (diff > 0) {
                    deficits[i] = diff;
                    availableBuyBudget += diff;
                }
            }
            // Buy-only mode: consume only existing unallocated cashflow budget.
            // Since this model does not track separate cash buckets, no forced sells are executed.
            turnoverAmount = 0;
            void availableBuyBudget;
        }

        syncGeneralFromAssets();
        if (balGeneral <= 0) return 0;

        if (!allowSell) {
            return 0;
        }

        let moved = 0;
        for (let i = 0; i < assetBalances.length; i++) {
            moved += Math.abs(assetBalances[i] - beforeBalances[i]);
        }
        return moved * 0.5;
    };

    // Phase 1: New Assets State
    const realEstateValues = ctx.realEstateState ? Float64Array.from(ctx.realEstateState.initialValues) : null;
    const pensionValues = ctx.pensionState ? Float64Array.from(ctx.pensionState.initialValues) : null;

    // Determine Annuity Payout at retirement
    let privateMonthlyPayout = 0;

    // Use a pre-sized array for timeline to avoid push() overhead.
    const timeline: TimelineRow[] = captureTimeline ? new Array(totalMonths) : [];
    let cpi = 1.0;

    // SWR State
    let swrBaseAmount = 0;
    let cpiAtRetire = 1.0;

    // Used by VPW/Guardrails without requiring timeline object access.
    let lastWithdrawalGross = 0;
    let finalTotalAssets = 0;
    let finalTotalAssetsReal = 0;
    let retirementTotalAssets = 0;
    let retirementTotalAssetsReal = 0;
    let firstDepletionMonth = -1;

    // Bucket State (Future expansion)
    // let bucketShort = 0;
    // let bucketMid = 0;
    // let bucketLong = 0;
    // let bucketInitialized = false;

    for (let m = 0; m < totalMonths; m++) {
        const age = current_age + m / 12.0;
        const isRetired = m >= monthsToRetire;

        // CPI priority: historical path inflation -> configured spike path -> base inflation.
        let effectiveInflM = infl_m;
        if (ctx.historicalInflation && ctx.historicalInflation.length > 0 && historicalPathIndex !== undefined) {
            const inflIdx = (historicalOffset + m) % ctx.historicalInflation.length;
            effectiveInflM = ctx.historicalInflation[inflIdx];
        } else if (ctx.inflationByMonth) {
            effectiveInflM = ctx.inflationByMonth[m];
        }
        cpi *= (1.0 + effectiveInflM);

        // 1. One-off events (Inflation Adjusted)
        const eventAmountRaw = eventsMap.get(m);
        if (eventAmountRaw) {
            applyGeneralDelta(eventAmountRaw * cpi, Boolean(ctx.taxEfficientRebalance));
        }

        // 2. Debt
        if (debt > 0) {
            debt *= (1.0 + debtMonthlyRate);
            const pay = input.debt.monthly_payment > 0 ? Math.min(input.debt.monthly_payment, debt) : 0;
            debt -= pay;
            applyGeneralDelta(-pay);
        }

        // 3. Contributions (Working years)
        if (!isRetired) {
            const contribution = contributionByMonth ? contributionByMonth[m] : input.general.monthly_contribution;
            applyGeneralDelta(contribution, Boolean(ctx.taxEfficientRebalance));
            balPrivate += input.private_pension.monthly_contribution;
        }

        // Phase 1: Business Income
        if (ctx.businessIncomeByMonth) {
            applyGeneralDelta(ctx.businessIncomeByMonth[m], Boolean(ctx.taxEfficientRebalance));
        }

        // 4. Returns
        const beforeGeneralReturn = balGeneral;
        if (assetBalances) {
            const historicalAssetReturns = ctx.historicalAssetReturns;
            const correlation = Math.max(-0.99, Math.min(0.99, ctx.correlation ?? (input.portfolio.manualCorrelation ?? 0)));
            const idioScale = Math.sqrt(Math.max(0, 1 - correlation * correlation));
            const commonShock = stochastic ? randomNormal() : 0;

            const stressStart = input.stress_test?.enabled
                ? (input.stress_test.startFromRetirement ? monthsToRetire : 0)
                : -1;
            const stressEnd = input.stress_test?.enabled
                ? Math.min(totalMonths, stressStart + input.stress_test.durationMonths)
                : -1;
            const stressRate = input.stress_test?.enabled
                ? Math.pow(1 - input.stress_test.annualDeclineRate, 1.0 / 12.0) - 1
                : 0;

            for (let i = 0; i < assetBalances.length; i++) {
                let assetReturn = ctx.assetExpectedMonthlyReturns?.[i] ?? mu_m;

                if (historicalAssetReturns && historicalPathIndex !== undefined && historicalAssetReturns[i]) {
                    const idx = (historicalOffset + m) % historicalAssetReturns[i].length;
                    assetReturn = historicalAssetReturns[i][idx];
                } else if (stochastic) {
                    const vol = ctx.assetMonthlyVolatility?.[i] ?? 0;
                    const idiosyncraticShock = randomNormal();
                    const combinedShock = (correlation * commonShock) + (idioScale * idiosyncraticShock);
                    assetReturn += (vol * combinedShock);
                }

                if (input.stress_test?.enabled && m >= stressStart && m < stressEnd) {
                    assetReturn = stressRate;
                }

                const safeGrowth = Math.max(-0.99, assetReturn);
                assetBalances[i] *= (1 + safeGrowth);
            }
            syncGeneralFromAssets();
        } else {
            balGeneral *= (1.0 + r_general[m]);
        }

        const realizedGeneralReturn = beforeGeneralReturn > 0
            ? (balGeneral / beforeGeneralReturn) - 1
            : 0;

        // Bucket Strategy: Simulate Cash Buffer Return
        if (isRetired && input.withdrawal.strategy === 'bucket' && input.bucket) {
            const targetMon = input.withdrawal.targetMonthlySpending || 0;
            const cashYears = input.bucket.shortTermYears || 2;
            const cashTarget = targetMon * 12 * cashYears;
            const prevCash = Math.min(beforeGeneralReturn, cashTarget);

            if (prevCash > 0) {
                const correction = prevCash * (infl_m - realizedGeneralReturn);
                applyGeneralDelta(correction, Boolean(ctx.taxEfficientRebalance));
            }
        }

        // Phase 7: Auto-Rebalancing
        let shouldRebalance = false;
        if (input.rebalancing?.enabled) {
            if (ctx.rebalancingFrequency === "threshold") {
                const threshold = Math.max(0, ctx.thresholdPercent ?? 0.05);
                shouldRebalance = computeMaxDrift() > threshold;
            } else {
                shouldRebalance = Boolean(ctx.rebalanceMonths?.has(m));
            }
        }

        if (shouldRebalance) {
            if (assetBalances) {
                const turnover = rebalanceToTargets(!(ctx.taxEfficientRebalance ?? false));
                if (ctx.tradingCostRate && turnover > 0) {
                    applyGeneralDelta(-(turnover * ctx.tradingCostRate));
                }
            } else if (ctx.tradingCostRate && balGeneral > 0) {
                const tradingCost = balGeneral * ctx.tradingCostRate;
                applyGeneralDelta(-tradingCost);
            }
        }

        balGeneral = Math.max(0, balGeneral);
        balPrivate *= (1.0 + r_private);

        // Phase 1: Real Estate Growth & Income
        let realEstateTotal = 0;
        if (realEstateValues && ctx.realEstateState) {
            for (let i = 0; i < realEstateValues.length; i++) {
                // Growth
                realEstateValues[i] *= (1.0 + ctx.realEstateState.growthRates[i]);
                realEstateTotal += realEstateValues[i];

                // Income (Rent - Management)
                const rent = realEstateValues[i] * ctx.realEstateState.rentalYields[i];
                const cost = realEstateValues[i] * ctx.realEstateState.managementCosts[i];
                applyGeneralDelta(rent - cost, Boolean(ctx.taxEfficientRebalance));
            }
        }

        // Phase 1: Additional Pensions Growth
        let additionalPensionTotal = 0;
        let additionalPensionPayout = 0;

        if (pensionValues && ctx.pensionState) {
            for (let i = 0; i < pensionValues.length; i++) {
                const config = ctx.pensionState.configs[i];

                // Growth phase (if not paying out yet, or even during payout for remaining balance? Assumed accumulation until startAge)
                const inPayout = age >= config.startAge;

                if (!inPayout) {
                    // Accumulation
                    pensionValues[i] *= (1.0 + ctx.pensionState.monthlyRates[i]);
                    pensionValues[i] += config.monthlyContribution;
                    additionalPensionTotal += pensionValues[i];
                } else {
                    // Payout Phase logic
                    let payout = 0;

                    if (config.type === 'db' || config.type === 'national') {
                        // DB / National: Defined Benefit
                        // If monthlyPayout is explicitly defined, use it.
                        // Otherwise fallback to simple estimation (though usually DB should have explicit payout)
                        if (config.monthlyPayout) {
                            payout = config.monthlyPayout;
                        } else {
                            // Fallback: 0.5% of capitalized value (primitive estimation)
                            payout = pensionValues[i] * 0.005;
                        }
                        additionalPensionPayout += payout;
                        // DB with finite period should decrease balance
                        if (config.payoutType === 'fixed_period' && config.payoutYears) {
                            pensionValues[i] = Math.max(0, pensionValues[i] - payout);
                        }
                        additionalPensionTotal += pensionValues[i];
                    } else {
                        // DC / Personal: Drawdown from balance
                        if (config.payoutYears && config.payoutYears > 0) {
                            // Fixed period drawdown logic
                            // Calculate remaining months
                            // Note: payoutYears is total duration. 
                            const monthsElapsed = Math.max(0, m - ((config.startAge - input.current_age) * 12));
                            const monthsTotal = config.payoutYears * 12;
                            const monthsLeft = Math.max(1, monthsTotal - monthsElapsed);

                            // Simple spread: Balance / MonthsLeft
                            // This varies monthly as balance grows/shrinks.
                            payout = pensionValues[i] / monthsLeft;
                        } else {
                            // Safe Withdrawal Rate style or Perpetuity?
                            // Default to ~6% annual rate (0.5% monthly)
                            payout = pensionValues[i] * 0.005;
                        }

                        // Cap to available balance
                        payout = Math.min(payout, pensionValues[i]);

                        pensionValues[i] -= payout;
                        additionalPensionPayout += payout;
                        additionalPensionTotal += pensionValues[i];
                    }
                }
            }
        }


        // 5. Compute Private Annuity at Retirement
        if (m === monthsToRetire) {
            privateMonthlyPayout = annuityPayment(
                balPrivate,
                input.private_pension.annuity_annual_rate,
                input.private_pension.payout_years
            );
        }

        // 6. Retirement Cashflows
        let natPension = 0;
        let privPension = 0;
        let withdrawalGross = 0;
        let reverseAnnuityIncome = 0;
        let severancePayout = 0;

        if (isRetired) {
            // National Pension
            const natStartAge = input.national_pension.startAge ?? 65;

            // Logic: Early (-6% per year), Delayed (+7.2% per year)
            // Optimization: This calculation is constant for a given simulation run (except inflation).
            // Could be hoisted? Yes, baseNat is constant.
            // But we need 'm' for inflation linking.

            let ageDiff = natStartAge - 65;
            if (ageDiff < -5) ageDiff = -5;
            if (ageDiff > 5) ageDiff = 5;

            let adjustmentFactor = 1.0;
            if (ageDiff < 0) adjustmentFactor = 1.0 - (Math.abs(ageDiff) * 0.06);
            else adjustmentFactor = 1.0 + (ageDiff * 0.072);

            const baseNat = input.national_pension.expected_monthly_benefit_at_retirement * adjustmentFactor;

            if (age >= natStartAge && baseNat > 0) {
                if (input.national_pension.inflation_linked) {
                    const monthsSinceRetire = m - monthsToRetire;
                    natPension = baseNat * Math.pow(1.0 + infl_m, monthsSinceRetire);
                } else {
                    natPension = baseNat;
                }
            }

            // Private Pension
            if (privateMonthlyPayout > 0) {
                const monthsAfterRetire = m - monthsToRetire;
                if (monthsAfterRetire < input.private_pension.payout_years * 12) {
                    privPension = privateMonthlyPayout;
                    balPrivate = Math.max(0, balPrivate - privPension);
                }
            }

            // NEW: Reverse Annuity (주택연금)
            if (ctx.reverseAnnuityStartMonth !== undefined &&
                ctx.reverseAnnuityPayment !== undefined &&
                m >= ctx.reverseAnnuityStartMonth) {
                reverseAnnuityIncome = ctx.reverseAnnuityPayment;
            }

            // NEW: Severance Monthly Payout (퇴직연금화)
            if (ctx.severanceMonthlyPayout !== undefined &&
                ctx.severanceMonth !== undefined &&
                m >= ctx.severanceMonth) {
                // Check if within payout period
                const severancePayoutMonths = (input.severance?.annuityYears || 10) * 12;
                if (m < ctx.severanceMonth + severancePayoutMonths) {
                    severancePayout = ctx.severanceMonthlyPayout;
                }
            }

            // Total guaranteed income
            const totalGuaranteedIncome = natPension + privPension + reverseAnnuityIncome + severancePayout + additionalPensionPayout;

            // Withdrawals from General
            const strategy = input.withdrawal.strategy;

            if (strategy === "fixed_amount") {
                withdrawalGross = input.withdrawal.fixedMonthlyAmount || 0;
            } else if (strategy === "target_spending") {
                const target = input.withdrawal.targetMonthlySpending || 0;
                withdrawalGross = Math.max(0, target - totalGuaranteedIncome);
            } else if (strategy === "fixed_percentage") {
                const rate = input.withdrawal.percentageRate || 0.04;
                withdrawalGross = balGeneral * (rate / 12.0);
            } else if (strategy === "safe_withdrawal_rate") {
                // SWR: 4% of Initial Portfolio at Retirement, subsequently adjusted for inflation
                // Calculate base amount at retirement moment
                if (swrBaseAmount === 0 && (isRetired || m === monthsToRetire)) {
                    const rate = input.withdrawal.initialSafeRate || 0.04;
                    swrBaseAmount = (balGeneral + balPrivate) * rate;
                    cpiAtRetire = cpi;
                }

                if (swrBaseAmount > 0) {
                    // Adjust for inflation
                    const annualWithdrawal = swrBaseAmount * (cpi / cpiAtRetire);
                    withdrawalGross = annualWithdrawal / 12.0;
                } else {
                    withdrawalGross = 0;
                }
            } else if (strategy === "vpw") {
                // Use pre-calculated portfolio return from context for efficiency
                const annualNominalReturn = ctx.annualPortfolioReturn ?? 0;
                const inflation = ctx.annualInflation ?? input.annual_inflation;
                // Real return = (1 + nominal) / (1 + inflation) - 1
                const realReturn = (1.0 + annualNominalReturn) / (1.0 + inflation) - 1.0;

                const currentAgeYear = Math.floor(age);
                const vpwRate = calculateVPWRate(currentAgeYear, input.end_age, realReturn);

                let appliedRate = vpwRate;
                if (input.withdrawal.vpwMaxWithdrawalRate) {
                    appliedRate = Math.min(appliedRate, input.withdrawal.vpwMaxWithdrawalRate);
                }
                if (input.withdrawal.vpwMinWithdrawalRate) {
                    appliedRate = Math.max(appliedRate, input.withdrawal.vpwMinWithdrawalRate);
                }

                let targetWithdrawal = balGeneral * (appliedRate / 12.0);

                if (input.withdrawal.vpwMaxYoYChange) {
                    const prevMonth = m - 1;
                    if (prevMonth >= monthsToRetire) {
                        const lastWithdrawal = lastWithdrawalGross > 0 ? lastWithdrawalGross : targetWithdrawal;
                        // Limit monthly change to approximate the annual max YoY change
                        const maxChangePerMonth = Math.pow(1 + input.withdrawal.vpwMaxYoYChange, 1 / 12) - 1;
                        const upperBound = lastWithdrawal * (1 + maxChangePerMonth);
                        const lowerBound = lastWithdrawal * (1 - maxChangePerMonth);
                        targetWithdrawal = Math.min(upperBound, Math.max(lowerBound, targetWithdrawal));
                    }
                }

                withdrawalGross = targetWithdrawal;
            } else if (strategy === "guardrails" && input.guardrails) {
                // NEW: Guardrails Strategy
                const gr = input.guardrails;
                const monthsAfterRetire = m - monthsToRetire;

                // Initial withdrawal based on base rate
                let targetWithdrawal = balGeneral * (gr.baseRate / 12.0);

                if (monthsAfterRetire > 0) {
                    // Calculate current withdrawal rate
                    // Fix: Only reference previous month if it's after retirement started
                    const lastWithdrawal = lastWithdrawalGross > 0 ? lastWithdrawalGross : targetWithdrawal;
                    const currentRate = balGeneral > 0 ? (lastWithdrawal * 12) / balGeneral : 0;

                    // Apply guardrails adjustment
                    if (currentRate > gr.upperThreshold) {
                        // Asset fell, reduce withdrawal by adjustment rate
                        targetWithdrawal = lastWithdrawal * (1 - gr.adjustmentRate);
                    } else if (currentRate < gr.lowerThreshold) {
                        // Asset grew, increase withdrawal by adjustment rate
                        targetWithdrawal = lastWithdrawal * (1 + gr.adjustmentRate);
                    } else {
                        targetWithdrawal = lastWithdrawal;
                    }

                    // Apply inflation adjustment annually
                    if (m % 12 === 0) {
                        targetWithdrawal *= (1 + infl_m * 12);
                    }
                }

                withdrawalGross = Math.max(0, targetWithdrawal);
            } else if (strategy === "bucket" && input.bucket) {
                // NEW: Bucket Strategy
                const bk = input.bucket;
                const monthsAfterRetire = m - monthsToRetire;

                // Calculate spending from short-term bucket
                const target = input.withdrawal.targetMonthlySpending || 0;
                withdrawalGross = Math.max(0, target - totalGuaranteedIncome);
            }

            if (withdrawalGross > balGeneral) {
                withdrawalGross = balGeneral;
            }
            applyGeneralDelta(-withdrawalGross);
            lastWithdrawalGross = withdrawalGross;

            // NEW: Health Insurance Deduction (건강보험료)
            // NEW: Health Insurance Deduction (건강보험료)
            let healthInsurancePremium = 0;
            if (input.health_insurance?.enabled) {
                const hi = input.health_insurance;

                if (hi.mode === 'detailed') {
                    // 1. Calculate Income (Pension + Withdrawal)
                    // Note: Withdrawal is NOT always considered income for Health Insurance (e.g. consuming principal is not income).
                    // Taxable Income usually includes: National Pension, Private Pension (Taxable part), Interest/Dividend.
                    // Consuming Savings (Withdrawal of principal) is NOT income.
                    // We will simplify: National Pension + Annuitized Private Pension + Business Income
                    // We exclude pure "Capital Withdrawal" for simplicity, or assume a portion is taxable?
                    // Safe approximation: NatPension + PrivPension + (Withdrawal * 0.1 Interest portion?)

                    // For 'taxable' income in KR Health Insurance:
                    // - National Pension: 100%
                    // - Private Pension: If strictly annuity? (Complex). Let's assume 100% for now to be conservative.
                    // - Financial Income (Interest/Div): > 10M separate? 

                    const consideredIncomeAnnual = (natPension + privPension + additionalPensionPayout) * 12;

                    // Property Value: Real Estate + (Maybe simulated House value)
                    // If input.realEstate exists, sum it up? 
                    // Or just use hi.propertyValue as a fixed base?
                    // Let's use hi.propertyValue (Static Base) + Dynamic Real Estate (if any)
                    // Let's use hi.propertyValue (Static Base) * CPI + Dynamic Real Estate (if any)
                    // We inflate the static property value manually since real estate assets inflate via growthRate
                    let totalProperty = (hi.propertyValue || 0) * cpi;
                    if (realEstateTotal > 0) totalProperty += realEstateTotal; // Add simulated real estate

                    // Calculate
                    const basePremium = calculateRegionalHealthInsurance(
                        consideredIncomeAnnual,
                        totalProperty,
                        hi.carValue || 0
                    );

                    // Inflation link? 
                    // Usually bracket thresholds rise with inflation, effectively neutralizing it?
                    // Or premium rises with income/asset growth?
                    // We will assume "Inflation Linked" means premium grows with CPI
                    healthInsurancePremium = hi.inflationLinked
                        ? basePremium * cpi
                        : basePremium;

                } else {
                    // Simple Mode
                    const base = hi.monthlyPremium || 0;
                    healthInsurancePremium = hi.inflationLinked
                        ? base * cpi
                        : base;
                }

                applyGeneralDelta(-healthInsurancePremium);
            }

            // NEW: Medical Shock (의료비 충격)
            const medicalShock = ctx.medicalShockMonths?.get(m);
            if (medicalShock) {
                applyGeneralDelta(-medicalShock);
            }
        }

        // Taxes
        let taxPaid = 0;
        const taxStrategy = input.withdrawal.taxStrategy || "simple";

        if (taxStrategy === "simple") {
            const taxRate = input.withdrawal.taxRate || 0.0;
            taxPaid = withdrawalGross * taxRate;
        } else {
            const totalMonthly = natPension + privPension + additionalPensionPayout + reverseAnnuityIncome + severancePayout + withdrawalGross;
            const annualIncome = totalMonthly * 12; // Simplified annualized

            // KR 2023 brackets
            let annualTax = 0;
            const deduction = 1500000;
            const taxable = Math.max(0, annualIncome - deduction);

            if (taxable <= 14000000) {
                annualTax = taxable * 0.06;
            } else if (taxable <= 50000000) {
                annualTax = (taxable * 0.15) - 1260000;
            } else if (taxable <= 88000000) {
                annualTax = (taxable * 0.24) - 5760000;
            } else if (taxable <= 150000000) {
                annualTax = (taxable * 0.35) - 15440000;
            } else {
                annualTax = (taxable * 0.38) - 19940000;
            }

            taxPaid = Math.max(0, annualTax / 12);
        }

        // Fix: Prevent NaN when totalIncome is 0
        const totalIncomeForTax = natPension + privPension + additionalPensionPayout + reverseAnnuityIncome + severancePayout + withdrawalGross;
        const annualTaxableIncome = Math.max(0, totalIncomeForTax * 12);
        const monthlyTaxCredit = calculateAnnualTaxCredit(input, annualTaxableIncome) / 12;
        taxPaid = Math.max(0, taxPaid - monthlyTaxCredit);

        const withdrawalNet = withdrawalGross > 0 && totalIncomeForTax > 0
            ? withdrawalGross - (taxPaid * (withdrawalGross / totalIncomeForTax))
            : withdrawalGross;
        const totalIncomeNet = totalIncomeForTax - taxPaid;
        const totalAssets = balGeneral + balPrivate - debt + realEstateTotal + additionalPensionTotal;
        const totalAssetsReal = totalAssets / cpi;

        if (m === monthsToRetire) {
            retirementTotalAssets = totalAssets;
            retirementTotalAssetsReal = totalAssetsReal;
        }
        if (firstDepletionMonth < 0 && totalAssets <= 0) {
            firstDepletionMonth = m;
        }

        finalTotalAssets = totalAssets;
        finalTotalAssetsReal = totalAssetsReal;

        if (trajectoryBaseOffset >= 0) {
            trajectorySink![trajectoryBaseOffset + m] = totalAssetsReal;
        }

        if (captureTimeline) {
            timeline[m] = {
                month: m,
                age,
                isRetired,
                general: balGeneral,
                privatePension: balPrivate,
                debt,
                realEstate: realEstateTotal,
                additionalPension: additionalPensionTotal,
                totalAssets,
                totalAssetsReal,
                cashflow: {
                    nationalPension: natPension,
                    privatePension: privPension,
                    additionalPension: additionalPensionPayout, // NEW
                    withdrawalGross,
                    withdrawalNet,
                    taxPaid,
                    totalIncomeNet
                }
            };
        }
    }
    // For variable path lengths (longevity risk), pad remaining months with terminal values.
    if (trajectoryBaseOffset >= 0 && totalMonths < trajectoryLength) {
        for (let m = totalMonths; m < trajectoryLength; m++) {
            trajectorySink![trajectoryBaseOffset + m] = finalTotalAssetsReal;
        }
    }

    return {
        timeline,
        finalTotalAssets,
        finalTotalAssetsReal,
        retirementTotalAssets:
            monthsToRetire >= 0 && monthsToRetire < totalMonths
                ? retirementTotalAssets
                : finalTotalAssets,
        retirementTotalAssetsReal:
            monthsToRetire >= 0 && monthsToRetire < totalMonths
                ? retirementTotalAssetsReal
                : finalTotalAssetsReal,
        retirementAge: input.retire_age,
        firstDepletionMonth,
        monthsSimulated: totalMonths
    };
}

export function runSimulation(
    input: SimulationInput,
    options?: SimulationRunOptions
): SimulationResult {
    const detailLevel = options?.detailLevel ?? "full";
    const isPreview = detailLevel === "preview";
    const includeSampleTimelines = options?.includeSampleTimelines ?? !isPreview;
    const includeTrajectoryStats = options?.includeTrajectoryStats ?? !isPreview;
    const includeSurvivalSeries = options?.includeSurvivalSeries ?? !isPreview;
    const maxSampleTimelines = Math.max(0, options?.maxSampleTimelines ?? (isPreview ? 1 : 3));
    const previewPathCap = options?.previewPathCap ?? 80;

    // Initialize seed for reproducible simulations
    setSeed(input.simulation_settings.seed);

    // 1. Pre-calculate Invariants
    const { mu, sigma } = calculatePortfolioMetrics(input);
    const mu_m = monthlyRateFromAnnual(mu);
    const sig_m = sigma / Math.sqrt(12.0);
    const r_private = monthlyRateFromAnnual(input.private_pension.annual_return);
    const scenarioBaseInflation = input.inflation_scenario?.baseRate;
    const annualInflation = typeof scenarioBaseInflation === "number"
        ? scenarioBaseInflation
        : input.annual_inflation;
    const infl_m = monthlyRateFromAnnual(annualInflation);

    const eventsMap = new Map<number, number>();
    input.events.forEach((e) => {
        const existing = eventsMap.get(e.month_index) || 0;
        eventsMap.set(e.month_index, existing + e.amount);
    });

    const monthsToRetire = (input.retire_age - input.current_age) * 12;
    const totalMonths = (input.end_age - input.current_age) * 12;

    // NEW: Prepare dynamic inflation array
    let inflationByMonth: Float64Array | undefined;
    if (input.inflation_scenario) {
        inflationByMonth = new Float64Array(totalMonths);
        const baseInflM = monthlyRateFromAnnual(input.inflation_scenario.baseRate);
        inflationByMonth.fill(baseInflM);

        if (
            input.inflation_scenario.type === 'spike' &&
            input.inflation_scenario.spikeStartAge !== undefined
        ) {
            const spikeInflM = monthlyRateFromAnnual(input.inflation_scenario.spikeRate || 0.06);
            const spikeStartMonth = (input.inflation_scenario.spikeStartAge - input.current_age) * 12;
            const spikeDuration = (input.inflation_scenario.spikeDurationYears || 3) * 12;

            for (let m = 0; m < totalMonths; m++) {
                if (m >= spikeStartMonth && m < spikeStartMonth + spikeDuration) {
                    inflationByMonth[m] = spikeInflM;
                }
            }
        }
    }

    // NEW: Prepare medical shock months
    let medicalShockMonths: Map<number, number> | undefined;
    if (input.medical_shocks?.enabled && input.medical_shocks.occurrences.length > 0) {
        medicalShockMonths = new Map();
        for (const shock of input.medical_shocks.occurrences) {
            const shockMonth = (shock.age - input.current_age) * 12;
            if (shockMonth >= 0 && shockMonth < totalMonths) {
                medicalShockMonths.set(shockMonth, shock.amount);
            }
        }
    }

    // NEW: Severance calculation
    let severanceMonth: number | undefined;
    let severanceMonthlyPayout: number | undefined;
    if (input.severance?.enabled) {
        severanceMonth = monthsToRetire;
        const severanceAmount = input.severance.estimatedAmount;
        if (input.severance.payoutType === 'lump_sum') {
            // Add to events map as lump sum at retirement
            const existing = eventsMap.get(monthsToRetire) || 0;
            eventsMap.set(monthsToRetire, existing + severanceAmount);
        } else {
            // Annuity payout
            const payoutYears = input.severance.annuityYears || 10;
            severanceMonthlyPayout = severanceAmount / (payoutYears * 12);
        }
    }

    // NEW: Reverse annuity calculation
    let reverseAnnuityStartMonth: number | undefined;
    let reverseAnnuityPayment: number | undefined;
    if (input.reverse_annuity?.enabled) {
        reverseAnnuityStartMonth = (input.reverse_annuity.startAge - input.current_age) * 12;
        reverseAnnuityPayment = input.reverse_annuity.monthlyPayment;
    }

    // NEW: Health insurance base (Legacy/Simple support)
    // let healthInsuranceBase: number | undefined; 
    // Handled dynamically in loop now for both modes to unify logic location


    // NEW: Prepare contribution array based on Salary/Savings Rate
    let contributionByMonth: Float64Array | undefined;
    if (input.labor_income?.enabled) {
        contributionByMonth = new Float64Array(totalMonths);

        let currentIncome = input.labor_income.currentNetMonthlyIncome;
        let currentRate = input.labor_income.currentSavingsRate;

        // Sort events by age
        const events = [...input.labor_income.events].sort((a, b) => a.age - b.age);
        let eventIdx = 0;

        for (let m = 0; m < totalMonths; m++) {
            const currentAge = input.current_age + m / 12.0;

            // Check if we hit an event
            while (eventIdx < events.length && currentAge >= events[eventIdx].age) {
                currentIncome = events[eventIdx].netMonthlyIncome;
                currentRate = events[eventIdx].savingsRate;
                eventIdx++;
            }

            const inflationFactor = Math.pow(1.0 + infl_m, m);
            contributionByMonth[m] = currentIncome * currentRate * inflationFactor;
        }
    }

    // --- Phase 1: Pre-calculate Business Income & Real Estate Setup ---
    let businessIncomeByMonth: Float64Array | undefined;
    if (input.businessIncome && input.businessIncome.length > 0) {
        businessIncomeByMonth = new Float64Array(totalMonths);
        for (const biz of input.businessIncome) {
            const startM = Math.max(0, (biz.startAge - input.current_age) * 12);
            const endM = Math.min(totalMonths, (biz.endAge - input.current_age) * 12);
            const growthM = monthlyRateFromAnnual(biz.growthRate);

            let currentMonthly = biz.monthlyIncome;
            for (let m = 0; m < totalMonths; m++) {
                if (m >= startM && m < endM) {
                    businessIncomeByMonth[m] += currentMonthly;
                }
                // Grow income
                currentMonthly *= (1 + growthM);
            }
        }
    }

    const realEstateState = input.realEstate ? {
        initialValues: input.realEstate.map(r => r.currentValue),
        growthRates: input.realEstate.map(r => monthlyRateFromAnnual(r.growthRate)),
        rentalYields: input.realEstate.map(r => r.rentalYield / 12),
        managementCosts: input.realEstate.map(r => r.managementCost / 12)
    } : undefined;

    const pensionState = input.additionalPensions ? {
        configs: input.additionalPensions,
        initialValues: input.additionalPensions.map(p => p.currentValue),
        monthlyRates: input.additionalPensions.map(p => monthlyRateFromAnnual(p.expectedReturn || 0.04))
    } : undefined;

    const ctx: SimulationContext = {
        mu_m,
        sig_m,
        r_private,
        infl_m,
        eventsMap,
        monthsToRetire,
        totalMonths,
        initialDebt: input.debt.current_balance,
        debtMonthlyRate: monthlyRateFromAnnual(input.debt.annual_interest),
        // New feature contexts
        inflationByMonth,
        severanceMonth,
        severanceMonthlyPayout,
        reverseAnnuityStartMonth,
        reverseAnnuityPayment,
        medicalShockMonths,
        contributionByMonth,
        // Phase 1
        businessIncomeByMonth,
        realEstateState,
        pensionState,
        // VPW optimization
        annualPortfolioReturn: mu,
        annualInflation
    };

    if (input.rebalancing?.enabled) {
        ctx.assetExpectedMonthlyReturns = input.portfolio.assetClasses.map((asset) =>
            monthlyRateFromAnnual(asset.expectedAnnualReturn)
        );
        ctx.assetMonthlyVolatility = input.portfolio.assetClasses.map((asset) =>
            asset.annualVolatility / Math.sqrt(12.0)
        );
        ctx.correlation = Math.max(-0.99, Math.min(0.99, input.portfolio.manualCorrelation ?? 0));
    }

    // Phase 7: Historical Mode - Prepare historical returns
    const isHistorical = input.simulation_settings.mode === "historical";
    if (isHistorical) {
        const startYear = input.simulation_settings.historical_start_year || 1985;
        const yearsNeeded = Math.ceil(totalMonths / 12) + 10; // Extra years for rolling windows

        // Calculate weighted portfolio historical returns
        const assets = input.portfolio.assetClasses;
        const annualReturns: number[] = [];
        const configuredMapping = input.simulation_settings.historical_asset_mapping ?? {};
        const assetAnnualReturns = assets.map((asset) => {
            const mappedType = configuredMapping[asset.id] ?? configuredMapping[asset.name];
            const histType = mappedType || mapAssetClassToHistorical(asset.name);
            return getHistoricalReturns(histType, startYear, yearsNeeded);
        });
        ctx.historicalAssetReturns = assetAnnualReturns.map((series) =>
            Float64Array.from(annualToMonthlyReturns(series, false))
        );

        for (let y = 0; y < yearsNeeded; y++) {
            let weightedReturn = 0;
            let totalAlloc = 0;

            for (let i = 0; i < assets.length; i++) {
                weightedReturn += (assetAnnualReturns[i][y] || 0) * assets[i].allocation;
                totalAlloc += assets[i].allocation;
            }

            if (totalAlloc > 0) weightedReturn /= totalAlloc;
            annualReturns.push(weightedReturn);
        }

        // Convert to monthly returns
        const monthlyReturns = annualToMonthlyReturns(annualReturns, false);
        ctx.historicalReturns = Float64Array.from(monthlyReturns);

        // Historical inflation
        const histInflation = getHistoricalInflation('korea', startYear, yearsNeeded);
        const monthlyInflation = annualToMonthlyReturns(histInflation, false);
        ctx.historicalInflation = Float64Array.from(monthlyInflation);
    }

    // Phase 7: Rebalancing - Prepare rebalance schedule
    if (input.rebalancing?.enabled) {
        ctx.rebalanceMonths = new Set<number>();
        ctx.tradingCostRate = input.rebalancing.tradingCostPercent || 0.001;
        ctx.targetAllocations = input.portfolio.assetClasses.map(a => a.allocation);
        ctx.thresholdPercent = input.rebalancing.thresholdPercent ?? 0.05;
        ctx.rebalancingFrequency = input.rebalancing.frequency;
        ctx.taxEfficientRebalance = input.rebalancing.taxEfficient ?? false;

        const freq = input.rebalancing.frequency;
        if (freq !== "threshold") {
            for (let m = 0; m < totalMonths; m++) {
                if (freq === 'monthly') {
                    ctx.rebalanceMonths.add(m);
                } else if (freq === 'quarterly' && m % 3 === 0) {
                    ctx.rebalanceMonths.add(m);
                } else if (freq === 'semi-annual' && m % 6 === 0) {
                    ctx.rebalanceMonths.add(m);
                } else if (freq === 'annual' && m % 12 === 0 && m > 0) {
                    ctx.rebalanceMonths.add(m);
                }
            }
        }
    }

    const stochastic = input.simulation_settings.mode === "montecarlo";

    // Phase 7: Historical Mode - Rolling window backtesting
    if (isHistorical) {
        // Run multiple rolling window scenarios
        const numScenarios = 20; // 20 rolling windows (1985-2005 start years)
        const MAX_SAMPLE_PATHS = includeSampleTimelines ? Math.min(maxSampleTimelines, numScenarios) : 0;
        const sampleTimelines: TimelineRow[][] = [];
        const finalAssets = new Float64Array(numScenarios);
        const finalAssetsReal = new Float64Array(numScenarios);
        const retirementAssets = new Float64Array(numScenarios);
        const retirementAssetsReal = new Float64Array(numScenarios);
        const firstDepletionMonthByPath = new Int32Array(numScenarios).fill(-1);
        const firstDepletionAgeByPath = new Float64Array(numScenarios).fill(-1);

        for (let p = 0; p < numScenarios; p++) {
            const simulation = simulateOnePath(input, ctx, false, p, { captureTimeline: true });
            finalAssets[p] = simulation.finalTotalAssets;
            finalAssetsReal[p] = simulation.finalTotalAssetsReal;
            retirementAssets[p] = simulation.retirementTotalAssets;
            retirementAssetsReal[p] = simulation.retirementTotalAssetsReal;
            firstDepletionMonthByPath[p] = simulation.firstDepletionMonth;
            firstDepletionAgeByPath[p] = simulation.firstDepletionMonth >= 0
                ? (input.current_age + (simulation.firstDepletionMonth / 12))
                : -1;

            if (MAX_SAMPLE_PATHS > 0 && p < MAX_SAMPLE_PATHS) {
                sampleTimelines.push(simulation.timeline);
            }
        }

        // Calculate success rate and stats
        let successes = 0;
        for (let i = 0; i < numScenarios; i++) {
            if (finalAssets[i] > 0) successes++;
        }

        const sortedReal = Float64Array.from(finalAssetsReal);
        sortedReal.sort();
        const sortedNom = Float64Array.from(finalAssets);
        sortedNom.sort();
        const sortedRetNom = Float64Array.from(retirementAssets);
        sortedRetNom.sort();
        const sortedRetReal = Float64Array.from(retirementAssetsReal);
        sortedRetReal.sort();
        const meanNom = meanTyped(finalAssets);
        const meanReal = meanTyped(finalAssetsReal);
        const neverDepletedCount = Array.from(firstDepletionMonthByPath).filter((month) => month < 0).length;
        const depletedAges = Array.from(firstDepletionAgeByPath).filter((age) => age >= 0).sort((a, b) => a - b);

        const summary: SimulationSummary = {
            retireAge: input.retire_age,
            endAge: input.end_age,
            source: "historical",
            finalTotalAssets: meanNom,
            finalTotalAssetsReal: meanReal,
            retirementPoint: {
                age: input.retire_age,
                totalAssets: percentileSorted(sortedRetNom, 50),
                totalAssetsReal: percentileSorted(sortedRetReal, 50)
            },
            successRate: successes / numScenarios,
            depletion: {
                firstDepletionMonthByPath: Array.from(firstDepletionMonthByPath),
                firstDepletionAgeByPath: Array.from(firstDepletionAgeByPath),
                neverDepletedRate: neverDepletedCount / numScenarios,
                medianDepletionAge: depletedAges.length > 0 ? percentileSorted(depletedAges, 50) : null
            },
            mc: {
                totalAssetsReal: {
                    p10: percentileSorted(sortedReal, 10),
                    p50: percentileSorted(sortedReal, 50),
                    p90: percentileSorted(sortedReal, 90),
                    mean: meanReal
                },
                totalAssets: {
                    p10: percentileSorted(sortedNom, 10),
                    p50: percentileSorted(sortedNom, 50),
                    p90: percentileSorted(sortedNom, 90),
                    mean: meanNom
                }
            }
        };

        return {
            mode: "montecarlo", // Return as montecarlo for UI compatibility
            detailLevel,
            pathCount: numScenarios,
            sampleTimelines,
            summary
        };
    }

    if (!stochastic) {
        // Deterministic Run
        const deterministic = simulateOnePath(input, ctx, false, undefined, { captureTimeline: true });
        const summary: SimulationSummary = {
            retireAge: input.retire_age,
            endAge: input.end_age,
            source: "deterministic",
            finalTotalAssets: deterministic.finalTotalAssets,
            finalTotalAssetsReal: deterministic.finalTotalAssetsReal,
            retirementPoint: {
                age: deterministic.retirementAge,
                totalAssets: deterministic.retirementTotalAssets,
                totalAssetsReal: deterministic.retirementTotalAssetsReal
            },
            successRate: deterministic.finalTotalAssets > 0 ? 1.0 : 0.0
        };

        return {
            mode: "deterministic",
            detailLevel,
            timeline: deterministic.timeline,
            summary
        };
    } else {
        // Monte Carlo Run
        const rawPaths = Number.isFinite(input.simulation_settings.mc_paths)
            ? input.simulation_settings.mc_paths
            : 100;
        const configuredPaths = Math.max(1, Math.floor(rawPaths || 100));
        const paths = isPreview ? Math.min(configuredPaths, previewPathCap) : configuredPaths;

        // Memory Optimization: Store only sample timelines
        const MAX_SAMPLE_PATHS = includeSampleTimelines ? Math.min(maxSampleTimelines, paths) : 0;
        const sampleTimelines: TimelineRow[][] = [];

        // Store only final values for stats
        const finalAssets = new Float64Array(paths);
        const finalAssetsReal = new Float64Array(paths);
        const retirementAssets = new Float64Array(paths);
        const retirementAssetsReal = new Float64Array(paths);
        const firstDepletionMonthByPath = new Int32Array(paths).fill(-1);
        const firstDepletionAgeByPath = new Float64Array(paths).fill(-1);

        // Fan Chart Accumulation: Store all "Total Assets Real" for all paths/months
        // Index = path * totalMonths + month
        // To be safer for memory with high path counts, we could only store percentiles on the fly.
        // But 1000 paths * 720 months = 720k doubles = ~5.7MB. Totally fine.
        const allTraj = !isPreview && (includeTrajectoryStats || includeSurvivalSeries)
            ? new Float64Array(paths * totalMonths)
            : null;

        let successCount = 0;

        for (let i = 0; i < paths; i++) {
            // Longevity Risk: Randomize end age per path if enabled
            let pathEndAge = input.end_age;
            if (input.longevity_risk?.useDistribution) {
                const meanAge = input.longevity_risk.averageLifeExpectancy || 85;
                const stdDev = input.longevity_risk.stdDevYears || 5;
                pathEndAge = Math.round(meanAge + stdDev * randomNormal());
                // Clamp to reasonable bounds
                pathEndAge = Math.max(input.retire_age + 1, Math.min(pathEndAge, 120));
            }

            // Create modified context with adjusted totalMonths for this path
            const pathTotalMonths = (pathEndAge - input.current_age) * 12;
            const pathCtx = { ...ctx, totalMonths: pathTotalMonths };
            const shouldCaptureTimeline = MAX_SAMPLE_PATHS > 0 && i < MAX_SAMPLE_PATHS;
            const simulation = simulateOnePath(input, pathCtx, true, undefined, {
                captureTimeline: shouldCaptureTimeline,
                trajectorySink: allTraj,
                trajectoryPathIndex: i,
                trajectoryLength: totalMonths
            });

            if (shouldCaptureTimeline) {
                sampleTimelines.push(simulation.timeline);
            }

            finalAssets[i] = simulation.finalTotalAssets;
            finalAssetsReal[i] = simulation.finalTotalAssetsReal;
            retirementAssets[i] = simulation.retirementTotalAssets;
            retirementAssetsReal[i] = simulation.retirementTotalAssetsReal;
            firstDepletionMonthByPath[i] = simulation.firstDepletionMonth;
            firstDepletionAgeByPath[i] = simulation.firstDepletionMonth >= 0
                ? (input.current_age + (simulation.firstDepletionMonth / 12))
                : -1;

            if (simulation.finalTotalAssets > 0) successCount++;
        }

        // Calculate Trajectory Stats (for Fan Chart)
        const trajStats = includeTrajectoryStats ? {
            month: [] as number[],
            p10: [] as number[],
            p25: [] as number[],
            p50: [] as number[],
            p75: [] as number[],
            p90: [] as number[]
        } : undefined;
        const survivalSeries = includeSurvivalSeries ? {
            month: [] as number[],
            age: [] as number[],
            survivalRate: [] as number[]
        } : undefined;
        if (allTraj) {
            const needsTrajectoryStats = Boolean(trajStats);
            const needsSurvivalSeries = Boolean(survivalSeries);
            const column = needsTrajectoryStats ? new Float64Array(paths) : null;

            for (let m = 0; m < totalMonths; m++) {
                let aliveCount = 0;

                if (needsTrajectoryStats) {
                    for (let p = 0; p < paths; p++) {
                        const value = allTraj[p * totalMonths + m];
                        column![p] = value;
                        if (needsSurvivalSeries && value > 0) {
                            aliveCount++;
                        }
                    }
                    column!.sort((a, b) => a - b);

                    trajStats!.month.push(m);
                    trajStats!.p10.push(percentileSorted(column!, 10));
                    trajStats!.p25.push(percentileSorted(column!, 25));
                    trajStats!.p50.push(percentileSorted(column!, 50));
                    trajStats!.p75.push(percentileSorted(column!, 75));
                    trajStats!.p90.push(percentileSorted(column!, 90));
                } else if (needsSurvivalSeries) {
                    for (let p = 0; p < paths; p++) {
                        const value = allTraj[p * totalMonths + m];
                        if (value > 0) {
                            aliveCount++;
                        }
                    }
                }

                if (needsSurvivalSeries) {
                    survivalSeries!.month.push(m);
                    survivalSeries!.age.push(Math.floor(input.current_age + m / 12));
                    survivalSeries!.survivalRate.push((aliveCount / paths) * 100);
                }
            }
        }
        const sortedNom = Float64Array.from(finalAssets);
        sortedNom.sort();
        const sortedReal = Float64Array.from(finalAssetsReal);
        sortedReal.sort();
        const sortedRetNom = Float64Array.from(retirementAssets);
        sortedRetNom.sort();
        const sortedRetReal = Float64Array.from(retirementAssetsReal);
        sortedRetReal.sort();

        const meanNom = meanTyped(finalAssets);
        const meanReal = meanTyped(finalAssetsReal);
        const neverDepletedCount = Array.from(firstDepletionMonthByPath).filter((month) => month < 0).length;
        const depletedAges = Array.from(firstDepletionAgeByPath).filter((age) => age >= 0).sort((a, b) => a - b);

        const summary: SimulationSummary = {
            retireAge: input.retire_age,
            endAge: input.end_age,
            source: "montecarlo",
            finalTotalAssets: meanNom,
            finalTotalAssetsReal: meanReal,
            retirementPoint: {
                age: input.retire_age,
                totalAssets: percentileSorted(sortedRetNom, 50),
                totalAssetsReal: percentileSorted(sortedRetReal, 50)
            },
            successRate: successCount / paths,
            depletion: {
                firstDepletionMonthByPath: Array.from(firstDepletionMonthByPath),
                firstDepletionAgeByPath: Array.from(firstDepletionAgeByPath),
                neverDepletedRate: neverDepletedCount / paths,
                medianDepletionAge: depletedAges.length > 0 ? percentileSorted(depletedAges, 50) : null
            },
            mc: {
                totalAssets: {
                    p10: percentileSorted(sortedNom, 10),
                    p50: percentileSorted(sortedNom, 50),
                    p90: percentileSorted(sortedNom, 90),
                    mean: meanNom
                },
                totalAssetsReal: {
                    p10: percentileSorted(sortedReal, 10),
                    p50: percentileSorted(sortedReal, 50),
                    p90: percentileSorted(sortedReal, 90),
                    mean: meanReal
                }
            }
        };

        return {
            mode: "montecarlo",
            detailLevel,
            pathCount: paths,
            sampleTimelines,
            summary,
            trajectoryStats: allTraj && trajStats ? trajStats : undefined,
            survivalSeries: allTraj && survivalSeries ? survivalSeries : undefined
        };
    }
}
