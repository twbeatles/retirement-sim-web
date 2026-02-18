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
    HISTORICAL_YEARS,
} from "./historicalData";
import {
    mean,
    percentile,
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

    const portfolioVol = Math.sqrt(varianceSum);

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
    historicalInflation?: Float64Array;

    // Phase 7: Rebalancing
    rebalanceMonths?: Set<number>; // Months when rebalancing occurs
    targetAllocations?: number[];  // Target allocation for each asset class
    tradingCostRate?: number;      // Trading cost as decimal
}

function simulateOnePath(
    input: SimulationInput,
    ctx: SimulationContext,
    stochastic: boolean,
    historicalPathIndex?: number, // For historical mode: which rolling window
): TimelineRow[] {
    const { current_age, retire_age } = input;
    const { mu_m, sig_m, r_private, infl_m, eventsMap, monthsToRetire, totalMonths, initialDebt, debtMonthlyRate, contributionByMonth } = ctx;

    if (totalMonths <= 0) return [];

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

    // Phase 1: New Assets State
    const realEstateValues = ctx.realEstateState ? Float64Array.from(ctx.realEstateState.initialValues) : null;
    const pensionValues = ctx.pensionState ? Float64Array.from(ctx.pensionState.initialValues) : null;

    // Determine Annuity Payout at retirement
    let privateMonthlyPayout = 0;

    // Use a pre-sized array for timeline to avoid push() overhead? 
    // Push is actually quite fast in V8, but pre-allocation is better for very large sizes.
    // For 50 years * 12 = 600 items, push is fine.
    const timeline: TimelineRow[] = new Array(totalMonths);
    let cpi = 1.0;

    // SWR State
    let swrBaseAmount = 0;
    let cpiAtRetire = 1.0;

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
            // Assume event amounts are in "Present Value" (Current purchasing power)
            // So we inflate them by CPI to get Nominal amount at time m.
            // Exception: If user intends "Nominal", this might over-inflate. 
            // But standard planning assumes PV.
            // For negative amounts (Expense), this increases the cost.
            // For positive amounts (Windfall), this increases the gain.
            // We use cpi (which is 1.0 at start).
            balGeneral += eventAmountRaw * cpi;
        }

        // 2. Debt
        if (debt > 0) {
            debt *= (1.0 + debtMonthlyRate);
            const pay = input.debt.monthly_payment > 0 ? Math.min(input.debt.monthly_payment, debt) : 0;
            debt -= pay;
            balGeneral -= pay;
        }

        // 3. Contributions (Working years)
        if (!isRetired) {
            // Apply dynamic contribution if enabled, otherwise static
            const contribution = contributionByMonth ? contributionByMonth[m] : input.general.monthly_contribution;
            balGeneral += contribution;
            balPrivate += input.private_pension.monthly_contribution;
        }

        // Phase 1: Business Income
        if (ctx.businessIncomeByMonth) {
            balGeneral += ctx.businessIncomeByMonth[m];
        }

        // 4. Returns
        balGeneral *= (1.0 + r_general[m]);

        // Bucket Strategy: Simulate Cash Buffer Return
        // If retired and using bucket strategy, the "Short Term" bucket should yield safer returns (e.g. inflation or low rate)
        // instead of the volatile portfolio return.
        if (isRetired && input.withdrawal.strategy === 'bucket' && input.bucket) {
            const targetMon = input.withdrawal.targetMonthlySpending || 0;
            const cashYears = input.bucket.shortTermYears || 2;
            const cashTarget = targetMon * 12 * cashYears;

            // Calculate previous balance (before r_general was applied) to determine cash portion
            const r_gen = r_general[m];
            const prevBal = balGeneral / (1.0 + r_gen);

            // Determine how much was in cash
            const prevCash = Math.min(prevBal, cashTarget);

            if (prevCash > 0) {
                // The cash portion should have grown by infl_m (safe rate) instead of r_gen
                // We subtract the wrong growth (r_gen) and add the correct growth (infl_m)
                const correction = prevCash * (infl_m - r_gen);
                balGeneral += correction;
            }
        }

        // Phase 7: Auto-Rebalancing
        // Apply trading cost when rebalancing occurs
        if (ctx.rebalanceMonths?.has(m) && ctx.tradingCostRate && balGeneral > 0) {
            // Simplified rebalancing: deduct trading cost from balance
            // NOTE: Since the main simulation assumes Constant Mix (implicit rebalancing),
            // this deduction represents the "friction" of maintaining that mix.
            // A precise simulation would track individual asset drifts and calculate turnover.
            const tradingCost = balGeneral * ctx.tradingCostRate;
            balGeneral -= tradingCost;
        }

        balGeneral = Math.max(0, balGeneral); // Safety clamp
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
                balGeneral += (rent - cost);
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

                withdrawalGross = balGeneral * (appliedRate / 12.0);
            } else if (strategy === "guardrails" && input.guardrails) {
                // NEW: Guardrails Strategy
                const gr = input.guardrails;
                const monthsAfterRetire = m - monthsToRetire;

                // Initial withdrawal based on base rate
                let targetWithdrawal = balGeneral * (gr.baseRate / 12.0);

                if (monthsAfterRetire > 0) {
                    // Calculate current withdrawal rate
                    // Fix: Only reference previous month if it's after retirement started
                    const prevMonth = m - 1;
                    const lastWithdrawal = prevMonth >= monthsToRetire
                        ? timeline[prevMonth]?.cashflow.withdrawalGross || targetWithdrawal
                        : targetWithdrawal;
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
            balGeneral -= withdrawalGross;

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

                balGeneral = Math.max(0, balGeneral - healthInsurancePremium);
            }

            // NEW: Medical Shock (의료비 충격)
            const medicalShock = ctx.medicalShockMonths?.get(m);
            if (medicalShock) {
                balGeneral = Math.max(0, balGeneral - medicalShock);
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
        const withdrawalNet = withdrawalGross > 0 && totalIncomeForTax > 0
            ? withdrawalGross - (taxPaid * (withdrawalGross / totalIncomeForTax))
            : withdrawalGross;
        const totalIncomeNet = totalIncomeForTax - taxPaid;
        const totalAssets = balGeneral + balPrivate - debt + realEstateTotal + additionalPensionTotal;
        const totalAssetsReal = totalAssets / cpi;

        // Assign TimelineRow to timeline array
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

    return timeline;
}

export function runSimulation(
    input: SimulationInput,
    options?: SimulationRunOptions
): SimulationResult {
    const detailLevel = options?.detailLevel ?? "full";
    const isPreview = detailLevel === "preview";
    const includeSampleTimelines = options?.includeSampleTimelines ?? !isPreview;
    const previewPathCap = options?.previewPathCap ?? 80;

    // Initialize seed for reproducible simulations
    setSeed(input.simulation_settings.seed);

    // 1. Pre-calculate Invariants
    const { mu, sigma } = calculatePortfolioMetrics(input);
    const mu_m = monthlyRateFromAnnual(mu);
    const sig_m = sigma / Math.sqrt(12.0);
    const r_private = monthlyRateFromAnnual(input.private_pension.annual_return);
    const infl_m = monthlyRateFromAnnual(input.annual_inflation);

    const eventsMap = new Map<number, number>();
    input.events.forEach(e => eventsMap.set(e.month_index, e.amount));

    const monthsToRetire = (input.retire_age - input.current_age) * 12;
    const totalMonths = (input.end_age - input.current_age) * 12;

    // NEW: Prepare dynamic inflation array for spike scenarios
    let inflationByMonth: Float64Array | undefined;
    if (input.inflation_scenario?.type === 'spike' &&
        input.inflation_scenario.spikeStartAge !== undefined) {
        inflationByMonth = new Float64Array(totalMonths);
        const baseInflM = monthlyRateFromAnnual(input.inflation_scenario.baseRate);
        const spikeInflM = monthlyRateFromAnnual(input.inflation_scenario.spikeRate || 0.06);
        const spikeStartMonth = (input.inflation_scenario.spikeStartAge - input.current_age) * 12;
        const spikeDuration = (input.inflation_scenario.spikeDurationYears || 3) * 12;

        for (let m = 0; m < totalMonths; m++) {
            if (m >= spikeStartMonth && m < spikeStartMonth + spikeDuration) {
                inflationByMonth[m] = spikeInflM;
            } else {
                inflationByMonth[m] = baseInflM;
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
        annualInflation: input.annual_inflation
    };

    // Phase 7: Historical Mode - Prepare historical returns
    const isHistorical = input.simulation_settings.mode === "historical";
    if (isHistorical) {
        const startYear = input.simulation_settings.historical_start_year || 1985;
        const yearsNeeded = Math.ceil(totalMonths / 12) + 10; // Extra years for rolling windows

        // Calculate weighted portfolio historical returns
        const assets = input.portfolio.assetClasses;
        const annualReturns: number[] = [];

        for (let y = 0; y < yearsNeeded; y++) {
            const yearIdx = (HISTORICAL_YEARS.indexOf(startYear) + y) % 40;
            let weightedReturn = 0;
            let totalAlloc = 0;

            for (const asset of assets) {
                const histType = mapAssetClassToHistorical(asset.name);
                const histReturns = getHistoricalReturns(histType, startYear, yearsNeeded);
                weightedReturn += (histReturns[y] || 0) * asset.allocation;
                totalAlloc += asset.allocation;
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

        const freq = input.rebalancing.frequency;
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
            // 'threshold' mode would require tracking asset values during simulation
        }
    }

    const stochastic = input.simulation_settings.mode === "montecarlo";

    // Phase 7: Historical Mode - Rolling window backtesting
    if (isHistorical) {
        // Run multiple rolling window scenarios
        const numScenarios = 20; // 20 rolling windows (1985-2005 start years)
        const MAX_SAMPLE_PATHS = includeSampleTimelines ? (isPreview ? 1 : 5) : 0;
        const sampleTimelines: TimelineRow[][] = [];
        const finalAssets = new Float64Array(numScenarios);
        const finalAssetsReal = new Float64Array(numScenarios);

        for (let p = 0; p < numScenarios; p++) {
            const timeline = simulateOnePath(input, ctx, false, p);
            const last = timeline[timeline.length - 1];
            finalAssets[p] = last.totalAssets;
            finalAssetsReal[p] = last.totalAssetsReal;

            if (MAX_SAMPLE_PATHS > 0 && p < MAX_SAMPLE_PATHS) {
                sampleTimelines.push(timeline);
            }
        }

        // Calculate success rate and stats
        let successes = 0;
        for (let i = 0; i < numScenarios; i++) {
            if (finalAssets[i] > 0) successes++;
        }

        const sortedReal = Array.from(finalAssetsReal).sort((a, b) => a - b);
        const sortedNom = Array.from(finalAssets).sort((a, b) => a - b);

        const summary: SimulationSummary = {
            retireAge: input.retire_age,
            endAge: input.end_age,
            finalTotalAssets: mean(Array.from(finalAssets)),
            finalTotalAssetsReal: mean(Array.from(finalAssetsReal)),
            successRate: successes / numScenarios,
            mc: {
                totalAssetsReal: {
                    p10: percentile(sortedReal, 10),
                    p50: percentile(sortedReal, 50),
                    p90: percentile(sortedReal, 90),
                    mean: mean(Array.from(finalAssetsReal))
                },
                totalAssets: {
                    p10: percentile(sortedNom, 10),
                    p50: percentile(sortedNom, 50),
                    p90: percentile(sortedNom, 90),
                    mean: mean(Array.from(finalAssets))
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
        const timeline = simulateOnePath(input, ctx, false);
        const last = timeline[timeline.length - 1];
        const summary: SimulationSummary = {
            retireAge: input.retire_age,
            endAge: input.end_age,
            finalTotalAssets: last.totalAssets,
            finalTotalAssetsReal: last.totalAssetsReal,
            successRate: last.totalAssets > 0 ? 1.0 : 0.0
        };

        return {
            mode: "deterministic",
            detailLevel,
            timeline,
            summary
        };
    } else {
        // Monte Carlo Run
        const configuredPaths = input.simulation_settings.mc_paths || 100;
        const paths = isPreview ? Math.min(configuredPaths, previewPathCap) : configuredPaths;

        // Memory Optimization: Store only sample timelines
        // We'll store up to 5 complete timelines for visualization
        const MAX_SAMPLE_PATHS = includeSampleTimelines ? (isPreview ? 1 : 5) : 0;
        const sampleTimelines: TimelineRow[][] = [];

        // Store only final values for stats
        const finalAssets = new Float64Array(paths);
        const finalAssetsReal = new Float64Array(paths);

        // Fan Chart Accumulation: Store all "Total Assets Real" for all paths/months
        // Index = path * totalMonths + month
        // To be safer for memory with high path counts, we could only store percentiles on the fly.
        // But 1000 paths * 720 months = 720k doubles = ~5.7MB. Totally fine.
        const allTraj = isPreview ? null : new Float64Array(paths * totalMonths);

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

            const tl = simulateOnePath(input, pathCtx, true);

            // Store sample
            if (MAX_SAMPLE_PATHS > 0 && i < MAX_SAMPLE_PATHS) {
                sampleTimelines.push(tl);
            }

            // Store Trajectory Data (use original totalMonths for consistent array size)
            if (allTraj) {
                for (let m = 0; m < totalMonths; m++) {
                    // If path ended earlier, use final value for remaining months
                    const tlIndex = Math.min(m, tl.length - 1);
                    allTraj[i * totalMonths + m] = tl[tlIndex]?.totalAssetsReal || 0;
                }
            }

            const last = tl[tl.length - 1];
            finalAssets[i] = last?.totalAssets || 0;
            finalAssetsReal[i] = last?.totalAssetsReal || 0;

            if ((last?.totalAssets || 0) > 0) successCount++;
        }

        // Convert Float64Array to number[] for math utils (or update math utils to support TypedArray)
        // Array.from is fast enough for 100-1000 items.
        const fa = Array.from(finalAssets);
        const far = Array.from(finalAssetsReal);

        // Calculate Trajectory Stats (for Fan Chart)
        const trajStats = {
            month: [] as number[],
            p10: [] as number[],
            p25: [] as number[],
            p50: [] as number[],
            p75: [] as number[],
            p90: [] as number[]
        };
        const survivalSeries = {
            month: [] as number[],
            age: [] as number[],
            survivalRate: [] as number[]
        };
        if (allTraj) {
            // Reuse buffer for sorting column
            const column = new Float64Array(paths);

            // Sample every 12 months (Annual) OR every month? 
            // Showing every month is heavy for chart. Let's do every 6 or 12 months?
            // Charts.tsx can sample. Let's provide raw monthly data (computation is cheap here).
            // Actually, sorting 1000 items 720 times is 720k * log(1000) ~ 7M ops. Fast.
            for (let m = 0; m < totalMonths; m++) {
                // Extract column
                let aliveCount = 0;
                for (let p = 0; p < paths; p++) {
                    const value = allTraj[p * totalMonths + m];
                    column[p] = value;
                    if (value > 0) {
                        aliveCount++;
                    }
                }
                column.sort((a, b) => a - b);

                trajStats.month.push(m);
                trajStats.p10.push(column[Math.floor(paths * 0.10)]);
                trajStats.p25.push(column[Math.floor(paths * 0.25)]);
                trajStats.p50.push(column[Math.floor(paths * 0.50)]);
                trajStats.p75.push(column[Math.floor(paths * 0.75)]);
                trajStats.p90.push(column[Math.floor(paths * 0.90)]);

                survivalSeries.month.push(m);
                survivalSeries.age.push(Math.floor(input.current_age + m / 12));
                survivalSeries.survivalRate.push((aliveCount / paths) * 100);
            }
        }

        const summary: SimulationSummary = {
            retireAge: input.retire_age,
            endAge: input.end_age,
            finalTotalAssets: mean(fa),
            finalTotalAssetsReal: mean(far),
            successRate: successCount / paths,
            mc: {
                totalAssets: {
                    p10: percentile(fa, 10),
                    p50: percentile(fa, 50),
                    p90: percentile(fa, 90),
                    mean: mean(fa)
                },
                totalAssetsReal: {
                    p10: percentile(far, 10),
                    p50: percentile(far, 50),
                    p90: percentile(far, 90),
                    mean: mean(far)
                }
            }
        };

        return {
            mode: "montecarlo",
            detailLevel,
            pathCount: paths,
            sampleTimelines,
            summary,
            trajectoryStats: allTraj ? trajStats : undefined,
            survivalSeries: allTraj ? survivalSeries : undefined
        };
    }
}
