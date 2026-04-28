import type { SimulationInput } from "../../logic/types";

export const QUICK_PRESETS = [
    {
        name: "조기은퇴 40세",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 30,
            retire_age: 40,
            end_age: 95,
            general: { ...base.general, monthly_contribution: 3000000 },
            withdrawal: {
                ...base.withdrawal,
                strategy: "safe_withdrawal_rate",
                initialSafeRate: 0.035,
            },
        }),
    },
    {
        name: "표준 60세",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 35,
            retire_age: 60,
            end_age: 90,
            general: { ...base.general, monthly_contribution: 1000000 },
            national_pension: {
                ...base.national_pension,
                startAge: 65,
                expected_monthly_benefit_at_retirement: 1500000,
            },
        }),
    },
    {
        name: "고자산 50세",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 30,
            retire_age: 50,
            general: {
                ...base.general,
                current_balance: 500000000,
                monthly_contribution: 500000,
            },
        }),
    },
];
