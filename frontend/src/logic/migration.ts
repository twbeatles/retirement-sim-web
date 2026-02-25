import { INITIAL_INPUT } from "./constants";
import { AssetClass, SimulationInput } from "./types";

type LegacySimulationInput = Partial<SimulationInput> & {
    retirement_monthly_spending_target?: number;
    portfolio?: {
        assetClasses?: AssetClass[];
        assets?: Array<{
            id?: string;
            name: string;
            expectedAnnualReturn?: number;
            annualVolatility?: number;
            allocation: number;
        }>;
        manualCorrelation?: number;
    };
    general?: {
        current_balance?: number;
        monthly_contribution?: number;
        annual_return?: number;
    };
};

function coerceAssetClasses(input: LegacySimulationInput): AssetClass[] {
    const assetClasses = input.portfolio?.assetClasses;
    if (Array.isArray(assetClasses) && assetClasses.length > 0) {
        return assetClasses.map((asset, index) => ({
            ...asset,
            id: asset.id || `asset_${index + 1}`
        }));
    }

    const legacyAssets = input.portfolio?.assets;
    if (Array.isArray(legacyAssets) && legacyAssets.length > 0) {
        return legacyAssets.map((asset, index) => ({
            id: asset.id || `asset_${index + 1}`,
            name: asset.name,
            expectedAnnualReturn: asset.expectedAnnualReturn ?? 0.05,
            annualVolatility: asset.annualVolatility ?? 0.15,
            allocation: asset.allocation
        }));
    }

    return INITIAL_INPUT.portfolio.assetClasses;
}

export function migrateSimulationInput(rawInput?: Partial<SimulationInput> | Record<string, unknown>): SimulationInput {
    const source = (rawInput ?? {}) as LegacySimulationInput;
    const base = INITIAL_INPUT;

    const withdrawal = { ...base.withdrawal, ...source.withdrawal };
    if (
        typeof source.retirement_monthly_spending_target === "number" &&
        (withdrawal.targetMonthlySpending === undefined || withdrawal.targetMonthlySpending === null)
    ) {
        withdrawal.targetMonthlySpending = source.retirement_monthly_spending_target;
    }

    const simulationMode = source.simulation_settings?.mode ?? "montecarlo";

    return {
        ...base,
        ...source,
        annual_inflation: source.annual_inflation ?? source.inflation_scenario?.baseRate ?? base.annual_inflation,
        general: { ...base.general, ...source.general },
        private_pension: { ...base.private_pension, ...source.private_pension },
        national_pension: { ...base.national_pension, ...source.national_pension },
        debt: { ...base.debt, ...source.debt },
        portfolio: {
            ...base.portfolio,
            ...source.portfolio,
            assetClasses: coerceAssetClasses(source)
        },
        withdrawal,
        simulation_settings: {
            ...base.simulation_settings,
            ...source.simulation_settings,
            mode: simulationMode
        },
        rebalancing: { ...base.rebalancing!, ...source.rebalancing },
        stress_test: { ...base.stress_test!, ...source.stress_test },
        labor_income: {
            ...base.labor_income!,
            ...source.labor_income,
            events: source.labor_income?.events ?? base.labor_income!.events
        },
        guardrails: { ...base.guardrails!, ...source.guardrails },
        bucket: { ...base.bucket!, ...source.bucket },
        health_insurance: { ...base.health_insurance!, ...source.health_insurance },
        severance: { ...base.severance!, ...source.severance },
        longevity_risk: { ...base.longevity_risk!, ...source.longevity_risk },
        medical_shocks: {
            ...base.medical_shocks!,
            ...source.medical_shocks,
            occurrences: source.medical_shocks?.occurrences ?? base.medical_shocks!.occurrences
        },
        reverse_annuity: { ...base.reverse_annuity!, ...source.reverse_annuity },
        inflation_scenario: { ...base.inflation_scenario!, ...source.inflation_scenario },
        tax_credit: {
            ...base.tax_credit!,
            ...source.tax_credit,
            mode: source.tax_credit?.mode ?? "law_2026",
            lawYear: 2026,
            incomeBasis: "simulated_taxable_income"
        },
        realEstate: source.realEstate ?? base.realEstate,
        additionalPensions: source.additionalPensions ?? base.additionalPensions,
        businessIncome: source.businessIncome ?? base.businessIncome,
        events: source.events ?? base.events,
        expense_definitions: source.expense_definitions ?? base.expense_definitions ?? []
    } as SimulationInput;
}
