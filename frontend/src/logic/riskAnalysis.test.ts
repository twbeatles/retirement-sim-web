import { describe, it, expect } from 'vitest';
import { runSensitivityAnalysis } from './riskAnalysis';
import type { SimulationInput } from './types';

function createSensitivityInput(): SimulationInput {
    return {
        current_age: 60,
        retire_age: 60,
        end_age: 95,
        annual_inflation: 0.02,
        inflation_scenario: {
            type: 'normal',
            baseRate: 0.02
        },
        portfolio: {
            assetClasses: [
                { id: 'balanced', name: 'Balanced', allocation: 1, expectedAnnualReturn: 0.045, annualVolatility: 0.12 }
            ],
            manualCorrelation: 1
        },
        general: {
            current_balance: 550000000,
            monthly_contribution: 0
        },
        private_pension: {
            current_balance: 0,
            monthly_contribution: 0,
            annual_return: 0,
            payout_years: 0,
            annuity_annual_rate: 0
        },
        national_pension: {
            expected_monthly_benefit_at_retirement: 0,
            inflation_linked: false
        },
        debt: {
            current_balance: 0,
            annual_interest: 0,
            monthly_payment: 0
        },
        withdrawal: {
            strategy: 'safe_withdrawal_rate',
            initialSafeRate: 0.05,
            taxRate: 0,
            taxStrategy: 'simple'
        },
        events: [],
        simulation_settings: {
            mode: 'montecarlo',
            mc_paths: 200,
            seed: 20260301
        }
    };
}

describe('runSensitivityAnalysis', () => {
    it('changes success rates across annual inflation variations when inflation scenario exists', () => {
        const input = createSensitivityInput();
        const result = runSensitivityAnalysis(input, 'annual_inflation', [-0.01, 0, 0.01]);

        expect(result.successRates).toHaveLength(3);
        const uniqueRates = new Set(result.successRates.map((rate) => rate.toFixed(4)));
        expect(uniqueRates.size).toBeGreaterThan(1);
    });
});
