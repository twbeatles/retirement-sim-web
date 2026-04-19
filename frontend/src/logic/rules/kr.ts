import type { DistributionStats, RuleMetadata, SimulationRuleSet } from "../types";
import { HISTORICAL_DATA_END_YEAR, HISTORICAL_DATA_START_YEAR } from "../historicalData";

export type KoreaIncomeTaxBracket = {
    upTo: number | null;
    rate: number;
    deduction: number;
};

export type KoreaRuleBook = {
    simulationRuleSet: SimulationRuleSet;
    tax: {
        basicDeduction: number;
        brackets: KoreaIncomeTaxBracket[];
        pensionTaxCredit: {
            lowIncomeThreshold: number;
            lowRate: number;
            highRate: number;
            pensionLimit: number;
            irpLimit: number;
            totalLimit: number;
        };
    };
    healthInsurance: {
        pointValue: number;
        incomeRate: number;
        minimumAnnualIncomeThreshold: number;
        propertyBasicDeduction: number;
        minimumPremium: number;
        maximumPremium: number;
        longTermCareRate: number;
        carPremiumThreshold: number;
    };
    pension: {
        baseStartAge: number;
        maxEarlyYears: number;
        maxDelayedYears: number;
        earlyReductionPerYear: number;
        delayedIncreasePerYear: number;
    };
};

export const KR_RULES_LATEST: KoreaRuleBook = {
    simulationRuleSet: {
        jurisdiction: "KR",
        version: "KR-2026.1",
        taxYear: 2026,
        healthInsuranceYear: 2024,
        pensionYear: 2026,
        historicalDataVersion: `KR-HIST-${HISTORICAL_DATA_START_YEAR}-${HISTORICAL_DATA_END_YEAR}-v1`,
        historicalDataStartYear: HISTORICAL_DATA_START_YEAR,
        historicalDataEndYear: HISTORICAL_DATA_END_YEAR
    },
    tax: {
        basicDeduction: 1500000,
        brackets: [
            { upTo: 14000000, rate: 0.06, deduction: 0 },
            { upTo: 50000000, rate: 0.15, deduction: 1260000 },
            { upTo: 88000000, rate: 0.24, deduction: 5760000 },
            { upTo: 150000000, rate: 0.35, deduction: 15440000 },
            { upTo: null, rate: 0.38, deduction: 19940000 }
        ],
        pensionTaxCredit: {
            lowIncomeThreshold: 55000000,
            lowRate: 0.165,
            highRate: 0.132,
            pensionLimit: 6000000,
            irpLimit: 3000000,
            totalLimit: 9000000
        }
    },
    healthInsurance: {
        pointValue: 208.4,
        incomeRate: 0.0709,
        minimumAnnualIncomeThreshold: 3360000,
        propertyBasicDeduction: 50000000,
        minimumPremium: 19780,
        maximumPremium: 4240000,
        longTermCareRate: 0.1295,
        carPremiumThreshold: 40000000
    },
    pension: {
        baseStartAge: 65,
        maxEarlyYears: 5,
        maxDelayedYears: 5,
        earlyReductionPerYear: 0.06,
        delayedIncreasePerYear: 0.072
    }
};

export function getLatestKoreaRuleBook(): KoreaRuleBook {
    return KR_RULES_LATEST;
}

function getRuleBookKey(ruleSet: SimulationRuleSet): string {
    return [
        ruleSet.version,
        ruleSet.taxYear,
        ruleSet.healthInsuranceYear,
        ruleSet.pensionYear,
        ruleSet.historicalDataVersion,
        ruleSet.historicalDataStartYear,
        ruleSet.historicalDataEndYear
    ].join("|");
}

const SUPPORTED_RULE_BOOKS = new Map<string, KoreaRuleBook>([
    [getRuleBookKey(KR_RULES_LATEST.simulationRuleSet), KR_RULES_LATEST]
]);

export function resolveKoreaRuleBook(ruleSet?: SimulationRuleSet): KoreaRuleBook {
    if (!ruleSet) {
        return KR_RULES_LATEST;
    }

    const exact = SUPPORTED_RULE_BOOKS.get(getRuleBookKey(ruleSet));
    if (!exact) {
        throw new Error(
            `Unsupported Korean rulebook: ${ruleSet.version} (tax ${ruleSet.taxYear}, health insurance ${ruleSet.healthInsuranceYear}, pension ${ruleSet.pensionYear})`
        );
    }

    return exact;
}

export function resolveSimulationRuleSet(ruleSet?: SimulationRuleSet): SimulationRuleSet {
    return resolveKoreaRuleBook(ruleSet).simulationRuleSet;
}

export function createRuleMetadata(ruleSet?: SimulationRuleSet): RuleMetadata {
    const resolved = resolveSimulationRuleSet(ruleSet);
    return {
        jurisdiction: resolved.jurisdiction,
        version: resolved.version,
        taxYear: resolved.taxYear,
        healthInsuranceYear: resolved.healthInsuranceYear,
        pensionYear: resolved.pensionYear,
        historicalDataVersion: resolved.historicalDataVersion,
        historicalDataRange: {
            startYear: resolved.historicalDataStartYear,
            endYear: resolved.historicalDataEndYear
        }
    };
}

export function calculateProgressiveIncomeTax(annualIncome: number, ruleSet?: SimulationRuleSet): number {
    const rules = resolveKoreaRuleBook(ruleSet);

    const taxable = Math.max(0, annualIncome - rules.tax.basicDeduction);
    const bracket =
        rules.tax.brackets.find((item) => item.upTo === null || taxable <= item.upTo) ??
        rules.tax.brackets[rules.tax.brackets.length - 1];

    return Math.max(0, (taxable * bracket.rate) - bracket.deduction);
}

export function calculateNationalPensionAdjustmentFactor(startAge: number | undefined, ruleSet?: SimulationRuleSet): number {
    const rules = resolveKoreaRuleBook(ruleSet);

    const age = startAge ?? rules.pension.baseStartAge;
    const rawDiff = age - rules.pension.baseStartAge;
    const clampedDiff = Math.max(-rules.pension.maxEarlyYears, Math.min(rules.pension.maxDelayedYears, rawDiff));

    if (clampedDiff < 0) {
        return 1 - (Math.abs(clampedDiff) * rules.pension.earlyReductionPerYear);
    }

    return 1 + (clampedDiff * rules.pension.delayedIncreasePerYear);
}

export function calculateAnnualPensionTaxCredit(
    pensionSavingsContribution: number,
    irpContribution: number,
    annualTaxableIncome: number,
    manualRate?: number,
    useManualRate = false,
    ruleSet?: SimulationRuleSet
): number {
    const rules = resolveKoreaRuleBook(ruleSet);

    const eligiblePension = Math.min(
        Math.max(0, pensionSavingsContribution),
        rules.tax.pensionTaxCredit.pensionLimit
    );
    const eligibleIRP = Math.min(
        Math.max(0, irpContribution),
        rules.tax.pensionTaxCredit.irpLimit
    );
    const totalEligible = Math.min(
        eligiblePension + eligibleIRP,
        rules.tax.pensionTaxCredit.totalLimit
    );
    const creditRate = useManualRate
        ? Math.max(0, manualRate ?? rules.tax.pensionTaxCredit.highRate)
        : annualTaxableIncome <= rules.tax.pensionTaxCredit.lowIncomeThreshold
            ? rules.tax.pensionTaxCredit.lowRate
            : rules.tax.pensionTaxCredit.highRate;

    return totalEligible * creditRate;
}

export function createDistributionStatsFromValue(value: number): DistributionStats {
    return {
        p10: value,
        p50: value,
        p90: value,
        mean: value
    };
}
