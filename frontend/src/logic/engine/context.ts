import {
    annualToMonthlyReturns,
    clampHistoricalStartYear,
    getHistoricalInflation,
    getHistoricalReturns,
    mapAssetClassToHistorical,
} from "../historicalData";
import { monthlyRateFromAnnual } from "../math";
import type { SimulationPlanV3 } from "../plan";
import { createRuleMetadata } from "../rules/kr";
import type { SimulationInput } from "../types";
import { calculatePortfolioMetrics } from "./portfolio";
import type { IncomeTreatment, LiquidAccountBucket, SimulationContext } from "./types";

function buildLiquidWithdrawalOrder(plan?: SimulationPlanV3): LiquidAccountBucket[] | undefined {
    if (!plan) {
        return undefined;
    }

    const priorities = new Map<LiquidAccountBucket, number>();
    for (const account of plan.accounts) {
        if (account.type === "cash" || account.type === "taxable_investment") {
            priorities.set("general", Math.min(priorities.get("general") ?? Number.POSITIVE_INFINITY, account.withdrawalPriority));
        }
        if (
            account.type === "pension_savings" ||
            account.type === "irp" ||
            account.type === "dc" ||
            account.type === "db" ||
            account.type === "annuity"
        ) {
            priorities.set("privatePension", Math.min(priorities.get("privatePension") ?? Number.POSITIVE_INFINITY, account.withdrawalPriority));
        }
    }

    const order = Array.from(priorities.entries())
        .sort((left, right) => {
            const priorityDistance = left[1] - right[1];
            return Math.abs(priorityDistance) > 1e-9
                ? priorityDistance
                : left[0].localeCompare(right[0]);
        })
        .map(([bucket]) => bucket);

    return order.length > 0 ? order : undefined;
}

function buildIncomeTreatmentBySource(plan?: SimulationPlanV3): SimulationContext["incomeTreatmentBySource"] {
    if (!plan) {
        return undefined;
    }

    const streamTypeToSource = {
        salary: "salary",
        national_pension: "nationalPension",
        private_annuity: "additionalPension",
        db_pension: "additionalPension",
        rental_income: "rentalIncome",
        business_income: "businessIncome",
        severance: "severance",
        reverse_mortgage: "reverseMortgage"
    } as const;

    const bySource: SimulationContext["incomeTreatmentBySource"] = {};
    for (const stream of plan.incomeStreams) {
        const source = streamTypeToSource[stream.type];
        const current = bySource[source];
        const next: IncomeTreatment = {
            taxable: (current?.taxable ?? false) || stream.taxable,
            healthInsuranceIncluded: (current?.healthInsuranceIncluded ?? false) || stream.healthInsuranceIncluded
        };
        bySource[source] = next;
    }

    return bySource;
}

export function buildSimulationContext(input: SimulationInput, plan?: SimulationPlanV3): SimulationContext {
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
    input.events.forEach((event) => {
        const existing = eventsMap.get(event.month_index) || 0;
        eventsMap.set(event.month_index, existing + event.amount);
    });

    const monthsToRetire = (input.retire_age - input.current_age) * 12;
    const totalMonths = (input.end_age - input.current_age) * 12;

    let inflationByMonth: Float64Array | undefined;
    if (input.inflation_scenario) {
        inflationByMonth = new Float64Array(totalMonths);
        const baseInflM = monthlyRateFromAnnual(input.inflation_scenario.baseRate);
        inflationByMonth.fill(baseInflM);

        if (
            input.inflation_scenario.type === "spike" &&
            input.inflation_scenario.spikeStartAge !== undefined
        ) {
            const spikeInflM = monthlyRateFromAnnual(input.inflation_scenario.spikeRate || 0.06);
            const spikeStartMonth = (input.inflation_scenario.spikeStartAge - input.current_age) * 12;
            const spikeDuration = (input.inflation_scenario.spikeDurationYears || 3) * 12;

            for (let month = 0; month < totalMonths; month++) {
                if (month >= spikeStartMonth && month < spikeStartMonth + spikeDuration) {
                    inflationByMonth[month] = spikeInflM;
                }
            }
        }
    }

    let medicalShockMonths: Map<number, number> | undefined;
    if (input.medical_shocks?.enabled && input.medical_shocks.occurrences.length > 0) {
        medicalShockMonths = new Map();
        for (const shock of input.medical_shocks.occurrences) {
            const shockMonth = (shock.age - input.current_age) * 12;
            if (shockMonth >= 0 && shockMonth < totalMonths) {
                const existing = medicalShockMonths.get(shockMonth) || 0;
                medicalShockMonths.set(shockMonth, existing + shock.amount);
            }
        }
    }

    let severanceMonth: number | undefined;
    let severanceMonthlyPayout: number | undefined;
    if (input.severance?.enabled) {
        severanceMonth = monthsToRetire;
        const severanceAmount = input.severance.estimatedAmount;
        if (input.severance.payoutType === "lump_sum") {
            const existing = eventsMap.get(monthsToRetire) || 0;
            eventsMap.set(monthsToRetire, existing + severanceAmount);
        } else {
            const payoutYears = input.severance.annuityYears || 10;
            severanceMonthlyPayout = severanceAmount / (payoutYears * 12);
        }
    }

    let reverseAnnuityStartMonth: number | undefined;
    let reverseAnnuityPayment: number | undefined;
    if (input.reverse_annuity?.enabled) {
        reverseAnnuityStartMonth = (input.reverse_annuity.startAge - input.current_age) * 12;
        reverseAnnuityPayment = input.reverse_annuity.monthlyPayment;
    }

    let contributionByMonth: Float64Array | undefined;
    let salaryIncomeByMonth: Float64Array | undefined;
    if (input.labor_income?.enabled) {
        contributionByMonth = new Float64Array(totalMonths);
        salaryIncomeByMonth = new Float64Array(totalMonths);

        let currentIncome = input.labor_income.currentNetMonthlyIncome;
        let currentRate = input.labor_income.currentSavingsRate;
        const events = [...input.labor_income.events].sort((a, b) => a.age - b.age);
        let eventIdx = 0;

        for (let month = 0; month < totalMonths; month++) {
            const currentAge = input.current_age + month / 12.0;

            while (eventIdx < events.length && currentAge >= events[eventIdx].age) {
                currentIncome = events[eventIdx].netMonthlyIncome;
                currentRate = events[eventIdx].savingsRate;
                eventIdx++;
            }

            const inflationFactor = Math.pow(1.0 + infl_m, month);
            salaryIncomeByMonth[month] = currentIncome * inflationFactor;
            contributionByMonth[month] = currentIncome * currentRate * inflationFactor;
        }
    }

    let businessIncomeByMonth: Float64Array | undefined;
    if (input.businessIncome && input.businessIncome.length > 0) {
        businessIncomeByMonth = new Float64Array(totalMonths);
        for (const business of input.businessIncome) {
            const startMonth = Math.max(0, (business.startAge - input.current_age) * 12);
            const endMonth = Math.min(totalMonths, (business.endAge - input.current_age) * 12);
            const growthM = monthlyRateFromAnnual(business.growthRate);

            let currentMonthly = business.monthlyIncome;
            for (let month = 0; month < totalMonths; month++) {
                if (month >= startMonth && month < endMonth) {
                    businessIncomeByMonth[month] += currentMonthly;
                }
                currentMonthly *= (1 + growthM);
            }
        }
    }

    const realEstateState = input.realEstate ? {
        initialValues: input.realEstate.map((asset) => asset.currentValue),
        growthRates: input.realEstate.map((asset) => monthlyRateFromAnnual(asset.growthRate)),
        rentalYields: input.realEstate.map((asset) => asset.rentalYield / 12),
        managementCosts: input.realEstate.map((asset) => asset.managementCost / 12)
    } : undefined;

    const pensionState = input.additionalPensions ? {
        configs: input.additionalPensions,
        initialValues: input.additionalPensions.map((pension) => pension.currentValue),
        monthlyRates: input.additionalPensions.map((pension) => monthlyRateFromAnnual(pension.expectedReturn || 0.04))
    } : undefined;

    const context: SimulationContext = {
        mu_m,
        sig_m,
        r_private,
        infl_m,
        eventsMap,
        monthsToRetire,
        totalMonths,
        initialDebt: input.debt.current_balance,
        debtMonthlyRate: monthlyRateFromAnnual(input.debt.annual_interest),
        inflationByMonth,
        severanceMonth,
        severanceMonthlyPayout,
        reverseAnnuityStartMonth,
        reverseAnnuityPayment,
        medicalShockMonths,
        contributionByMonth,
        salaryIncomeByMonth,
        businessIncomeByMonth,
        realEstateState,
        pensionState,
        annualPortfolioReturn: mu,
        annualInflation,
        liquidWithdrawalOrder: buildLiquidWithdrawalOrder(plan),
        incomeTreatmentBySource: buildIncomeTreatmentBySource(plan)
    };

    if (input.rebalancing?.enabled) {
        context.assetExpectedMonthlyReturns = input.portfolio.assetClasses.map((asset) =>
            monthlyRateFromAnnual(asset.expectedAnnualReturn)
        );
        context.assetMonthlyVolatility = input.portfolio.assetClasses.map((asset) =>
            asset.annualVolatility / Math.sqrt(12.0)
        );
        context.correlation = Math.max(-0.99, Math.min(0.99, input.portfolio.manualCorrelation ?? 0));
    }

    if (input.simulation_settings.mode === "historical") {
        const startYear = clampHistoricalStartYear(
            input.simulation_settings.historical_start_year ?? createRuleMetadata(input.rule_set).historicalDataRange.startYear
        );
        const yearsNeeded = Math.ceil(totalMonths / 12) + 10;
        const assets = input.portfolio.assetClasses;
        const annualReturns: number[] = [];
        const configuredMapping = input.simulation_settings.historical_asset_mapping ?? {};
        const assetAnnualReturns = assets.map((asset) => {
            const mappedType = configuredMapping[asset.id] ?? configuredMapping[asset.name];
            const histType = mappedType || mapAssetClassToHistorical(asset.name);
            return getHistoricalReturns(histType, startYear, yearsNeeded);
        });

        context.historicalAssetReturns = assetAnnualReturns.map((series) =>
            Float64Array.from(annualToMonthlyReturns(series, false))
        );

        for (let year = 0; year < yearsNeeded; year++) {
            let weightedReturn = 0;
            let totalAlloc = 0;

            for (let i = 0; i < assets.length; i++) {
                weightedReturn += (assetAnnualReturns[i][year] || 0) * assets[i].allocation;
                totalAlloc += assets[i].allocation;
            }

            if (totalAlloc > 0) {
                weightedReturn /= totalAlloc;
            }
            annualReturns.push(weightedReturn);
        }

        context.historicalReturns = Float64Array.from(annualToMonthlyReturns(annualReturns, false));
        context.historicalInflation = Float64Array.from(
            annualToMonthlyReturns(getHistoricalInflation("korea", startYear, yearsNeeded), false)
        );
    }

    if (input.rebalancing?.enabled) {
        context.rebalanceMonths = new Set<number>();
        context.tradingCostRate = input.rebalancing.tradingCostPercent || 0.001;
        context.targetAllocations = input.portfolio.assetClasses.map((asset) => asset.allocation);
        context.thresholdPercent = input.rebalancing.thresholdPercent ?? 0.05;
        context.rebalancingFrequency = input.rebalancing.frequency;
        context.taxEfficientRebalance = input.rebalancing.taxEfficient ?? false;

        const frequency = input.rebalancing.frequency;
        if (frequency !== "threshold") {
            for (let month = 0; month < totalMonths; month++) {
                if (frequency === "monthly") {
                    context.rebalanceMonths.add(month);
                } else if (frequency === "quarterly" && month % 3 === 0) {
                    context.rebalanceMonths.add(month);
                } else if (frequency === "semi-annual" && month % 6 === 0) {
                    context.rebalanceMonths.add(month);
                } else if (frequency === "annual" && month % 12 === 0 && month > 0) {
                    context.rebalanceMonths.add(month);
                }
            }
        }
    }

    return context;
}
