import type { SimulationInput, TimelineRow } from "../types";
import {
    randomNormal,
    randomNormalArray,
    annuityPayment,
    calculateVPWRate,
} from "../math";
import { calculateRegionalHealthInsurance } from "../koreaTax";
import {
    calculateNationalPensionAdjustmentFactor,
    calculateProgressiveIncomeTax,
} from "../rules/kr";
import { calculateAnnualTaxCredit } from "./summary";
import type {
    PathSimulationOptions,
    PathSimulationResult,
    SimulationContext,
} from "./types";
type TaxableSource = keyof NonNullable<SimulationContext["incomeTreatmentBySource"]>;

function isSourceTaxable(ctx: SimulationContext, source: TaxableSource): boolean {
    return ctx.incomeTreatmentBySource?.[source]?.taxable ?? true;
}

function isSourceHealthInsuranceIncluded(ctx: SimulationContext, source: TaxableSource): boolean {
    return ctx.incomeTreatmentBySource?.[source]?.healthInsuranceIncluded ?? true;
}

function addIfTaxable(ctx: SimulationContext, source: TaxableSource, amount: number): number {
    return isSourceTaxable(ctx, source) ? amount : 0;
}

function addIfHealthInsuranceIncluded(ctx: SimulationContext, source: TaxableSource, amount: number): number {
    return isSourceHealthInsuranceIncluded(ctx, source) ? amount : 0;
}

export function simulateOnePath(
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

    const applyPrivateDelta = (delta: number) => {
        balPrivate = Math.max(0, balPrivate + delta);
    };

    const withdrawLiquidity = (amount: number): number => {
        if (amount <= 0) {
            return 0;
        }

        const order = ctx.liquidWithdrawalOrder ?? ["general", "privatePension"];
        let remaining = amount;
        let withdrawn = 0;

        for (const bucket of order) {
            if (remaining <= 1e-6) {
                break;
            }

            if (bucket === "general") {
                const available = Math.max(0, balGeneral);
                const draw = Math.min(available, remaining);
                if (draw > 0) {
                    applyGeneralDelta(-draw);
                    remaining -= draw;
                    withdrawn += draw;
                }
                continue;
            }

            const available = Math.max(0, balPrivate);
            const draw = Math.min(available, remaining);
            if (draw > 0) {
                applyPrivateDelta(-draw);
                remaining -= draw;
                withdrawn += draw;
            }
        }

        return withdrawn;
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

        if (allowSell) {
            for (let i = 0; i < assetBalances.length; i++) {
                assetBalances[i] = targetValues[i];
            }
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
        let oneOffIncome = 0;
        let oneOffExpense = 0;
        let debtService = 0;
        let salaryIncome = 0;
        let businessIncomeCash = 0;
        let rentalIncomeCash = 0;
        let tradingCostPaid = 0;

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
            const eventAmount = eventAmountRaw * cpi;
            if (eventAmount >= 0) {
                oneOffIncome += eventAmount;
            } else {
                oneOffExpense += Math.abs(eventAmount);
            }
            applyGeneralDelta(eventAmount, Boolean(ctx.taxEfficientRebalance));
        }

        // 2. Debt
        if (debt > 0) {
            debt *= (1.0 + debtMonthlyRate);
            const pay = input.debt.monthly_payment > 0 ? Math.min(input.debt.monthly_payment, debt) : 0;
            debt -= pay;
            debtService += pay;
            applyGeneralDelta(-pay);
        }

        // 3. Contributions (Working years)
        if (!isRetired) {
            const contribution = contributionByMonth ? contributionByMonth[m] : input.general.monthly_contribution;
            salaryIncome = ctx.salaryIncomeByMonth ? ctx.salaryIncomeByMonth[m] : 0;
            applyGeneralDelta(contribution, Boolean(ctx.taxEfficientRebalance));
            balPrivate += input.private_pension.monthly_contribution;
        }

        // Phase 1: Business Income
        if (ctx.businessIncomeByMonth) {
            businessIncomeCash = ctx.businessIncomeByMonth[m];
            applyGeneralDelta(businessIncomeCash, Boolean(ctx.taxEfficientRebalance));
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
            const targetMon = (input.withdrawal.targetMonthlySpending || 0) * cpi;
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
                    tradingCostPaid = turnover * ctx.tradingCostRate;
                    applyGeneralDelta(-tradingCostPaid);
                }
            } else if (ctx.tradingCostRate && balGeneral > 0) {
                tradingCostPaid = balGeneral * ctx.tradingCostRate;
                applyGeneralDelta(-tradingCostPaid);
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
                rentalIncomeCash += Math.max(0, rent);
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
        let withdrawalPrincipal = 0;
        let reverseAnnuityIncome = 0;
        let severancePayout = 0;
        let healthInsurancePremium = 0;
        let healthInsuranceAssessableIncome = 0;
        const interestDividendIncome = 0;
        const realizedCapitalGain = 0;

        if (isRetired) {
            // National Pension
            const natStartAge = input.national_pension.startAge ?? 65;

            // Logic: Early (-6% per year), Delayed (+7.2% per year)
            // Optimization: This calculation is constant for a given simulation run (except inflation).
            // Could be hoisted? Yes, baseNat is constant.
            // But we need 'm' for inflation linking.

            const adjustmentFactor = calculateNationalPensionAdjustmentFactor(natStartAge, input.rule_set);
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
                const target = (input.withdrawal.targetMonthlySpending || 0) * cpi;
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
                // Calculate spending from short-term bucket
                const target = (input.withdrawal.targetMonthlySpending || 0) * cpi;
                withdrawalGross = Math.max(0, target - totalGuaranteedIncome);
            }

            const availableLiquidity = Math.max(0, balGeneral) + Math.max(0, balPrivate);
            withdrawalGross = Math.min(withdrawalGross, availableLiquidity);
            withdrawalPrincipal = withdrawalGross;
            withdrawalGross = withdrawLiquidity(withdrawalGross);
            withdrawalPrincipal = withdrawalGross;
            lastWithdrawalGross = withdrawalGross;

            // NEW: Health Insurance Deduction (건강보험료)
            // NEW: Health Insurance Deduction (건강보험료)
            if (input.health_insurance?.enabled) {
                const hi = input.health_insurance;

                if (hi.mode === 'detailed') {
                    if (hi.isDependent) {
                        healthInsurancePremium = 0;
                    } else {
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

                    const consideredIncomeAnnual = (
                        addIfHealthInsuranceIncluded(ctx, "salary", salaryIncome)
                        + addIfHealthInsuranceIncluded(ctx, "businessIncome", businessIncomeCash)
                        + addIfHealthInsuranceIncluded(ctx, "rentalIncome", rentalIncomeCash)
                        + addIfHealthInsuranceIncluded(ctx, "nationalPension", natPension)
                        + addIfHealthInsuranceIncluded(ctx, "privatePension", privPension)
                        + addIfHealthInsuranceIncluded(ctx, "additionalPension", additionalPensionPayout)
                        + addIfHealthInsuranceIncluded(ctx, "severance", severancePayout)
                        + addIfHealthInsuranceIncluded(ctx, "interestDividend", interestDividendIncome)
                        + addIfHealthInsuranceIncluded(ctx, "realizedCapitalGain", realizedCapitalGain)
                    ) * 12;
                    healthInsuranceAssessableIncome = consideredIncomeAnnual / 12;

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
                        hi.carValue || 0,
                        input.rule_set
                    );

                    // Inflation link? 
                    // Usually bracket thresholds rise with inflation, effectively neutralizing it?
                    // Or premium rises with income/asset growth?
                    // We will assume "Inflation Linked" means premium grows with CPI
                    healthInsurancePremium = hi.inflationLinked
                        ? basePremium * cpi
                        : basePremium;
                    }

                } else {
                    // Simple Mode
                    const base = hi.monthlyPremium || 0;
                    healthInsurancePremium = hi.inflationLinked
                        ? base * cpi
                        : base;
                }

                healthInsurancePremium = withdrawLiquidity(healthInsurancePremium);
            }

            // NEW: Medical Shock (의료비 충격)
            const medicalShock = ctx.medicalShockMonths?.get(m);
            if (medicalShock) {
                withdrawLiquidity(medicalShock);
            }
        }

        // Taxes
        let taxPaid = 0;
        const taxStrategy = input.withdrawal.taxStrategy || "simple";

        if (taxStrategy === "simple") {
            const taxRate = input.withdrawal.taxRate || 0.0;
            taxPaid = withdrawalGross * taxRate;
        } else {
            const totalMonthly =
                addIfTaxable(ctx, "salary", salaryIncome)
                + addIfTaxable(ctx, "businessIncome", businessIncomeCash)
                + addIfTaxable(ctx, "rentalIncome", rentalIncomeCash)
                + addIfTaxable(ctx, "nationalPension", natPension)
                + addIfTaxable(ctx, "privatePension", privPension)
                + addIfTaxable(ctx, "additionalPension", additionalPensionPayout)
                + addIfTaxable(ctx, "severance", severancePayout)
                + addIfTaxable(ctx, "interestDividend", interestDividendIncome)
                + addIfTaxable(ctx, "realizedCapitalGain", realizedCapitalGain);
            const annualIncome = totalMonthly * 12; // Simplified annualized

            const annualTax = calculateProgressiveIncomeTax(annualIncome, input.rule_set);
            taxPaid = Math.max(0, annualTax / 12);
        }

        // Fix: Prevent NaN when totalIncome is 0
        const totalIncomeForTax =
            addIfTaxable(ctx, "salary", salaryIncome)
            + addIfTaxable(ctx, "businessIncome", businessIncomeCash)
            + addIfTaxable(ctx, "rentalIncome", rentalIncomeCash)
            + addIfTaxable(ctx, "nationalPension", natPension)
            + addIfTaxable(ctx, "privatePension", privPension)
            + addIfTaxable(ctx, "additionalPension", additionalPensionPayout)
            + addIfTaxable(ctx, "severance", severancePayout)
            + addIfTaxable(ctx, "interestDividend", interestDividendIncome)
            + addIfTaxable(ctx, "realizedCapitalGain", realizedCapitalGain);
        const totalGrossCashIncome =
            salaryIncome
            + businessIncomeCash
            + rentalIncomeCash
            + natPension
            + privPension
            + additionalPensionPayout
            + severancePayout
            + reverseAnnuityIncome
            + interestDividendIncome
            + realizedCapitalGain
            + oneOffIncome
            + withdrawalGross;
        const annualTaxableIncome = Math.max(0, totalIncomeForTax * 12);
        const monthlyTaxCredit = calculateAnnualTaxCredit(input, annualTaxableIncome) / 12;
        taxPaid = Math.max(0, taxPaid - monthlyTaxCredit);
        taxPaid = withdrawLiquidity(taxPaid);

        const withdrawalNet = taxStrategy === "simple"
            ? Math.max(0, withdrawalGross - taxPaid)
            : withdrawalGross > 0 && totalIncomeForTax > 0
                ? withdrawalGross - (taxPaid * (withdrawalGross / totalIncomeForTax))
                : withdrawalGross;
        const totalIncomeNet = totalGrossCashIncome - taxPaid - healthInsurancePremium;
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
                inflationFactor: cpi,
                cashflow: {
                    nationalPension: natPension,
                    privatePension: privPension,
                    additionalPension: additionalPensionPayout, // NEW
                    withdrawalGross,
                    withdrawalNet,
                    taxPaid,
                    healthInsurancePremium,
                    taxCreditApplied: monthlyTaxCredit,
                    assessableIncomeForHealthInsurance: healthInsuranceAssessableIncome,
                    totalIncomeNet,
                    sources: {
                        salary: salaryIncome,
                        businessIncome: businessIncomeCash,
                        rentalIncome: rentalIncomeCash,
                        nationalPension: natPension,
                        privatePension: privPension,
                        additionalPension: additionalPensionPayout,
                        severance: severancePayout,
                        reverseMortgage: reverseAnnuityIncome,
                        interestDividend: interestDividendIncome,
                        realizedCapitalGain,
                        withdrawalPrincipal,
                        oneOffIncome,
                        oneOffExpense,
                        medicalShock: ctx.medicalShockMonths?.get(m) ?? 0,
                        housingCost: 0,
                        debtService,
                        tradingCost: tradingCostPaid
                    }
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

