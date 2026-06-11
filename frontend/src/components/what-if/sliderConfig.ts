import { type SimulationInput, type WhatIfParameter } from "../../logic/types";

export interface SliderConfig {
    id: WhatIfParameter;
    label: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
    getValue: (input: SimulationInput) => number;
    setValue: (input: SimulationInput, value: number) => SimulationInput;
}

export const WHAT_IF_SLIDERS: SliderConfig[] = [
    {
        id: 'retire_age',
        label: '은퇴 나이',
        min: 45,
        max: 70,
        step: 1,
        format: (v) => `${v}세`,
        getValue: (state) => state.retire_age,
        setValue: (state, value) => ({ ...state, retire_age: value })
    },
    {
        id: 'withdrawal_rate',
        label: '인출률',
        min: 0.02,
        max: 0.08,
        step: 0.005,
        format: (v) => `${(v * 100).toFixed(1)}%`,
        getValue: (state) => state.withdrawal.initialSafeRate || 0.04,
        setValue: (state, value) => ({
            ...state,
            withdrawal: { ...state.withdrawal, initialSafeRate: value }
        })
    },
    {
        id: 'monthly_contribution',
        label: '월 저축액',
        min: 0,
        max: 5000000,
        step: 100000,
        format: (v) => `${(v / 10000).toFixed(0)}만원`,
        getValue: (state) => state.general.monthly_contribution,
        setValue: (state, value) => ({
            ...state,
            general: { ...state.general, monthly_contribution: value }
        })
    },
    {
        id: 'initial_balance',
        label: '초기 자산',
        min: 0,
        max: 500000000,
        step: 10000000,
        format: (v) => `${(v / 100000000).toFixed(1)}억원`,
        getValue: (state) => state.general.current_balance,
        setValue: (state, value) => ({
            ...state,
            general: { ...state.general, current_balance: value }
        })
    }
];

export function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === "AbortError";
}

export function getSuccessRateToneClass(rate: number | null): string {
    if (rate === null) return 'text-sub';
    if (rate >= 0.9) return 'text-success';
    if (rate >= 0.7) return 'whatif-good';
    if (rate >= 0.5) return 'text-warning';
    return 'text-danger';
}

export function getProgressClass(rate: number | null): string {
    if (rate === null) return "bg-slate-200 dark:bg-zinc-700";
    if (rate >= 0.9) return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
    if (rate >= 0.7) return "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
    if (rate >= 0.5) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
}
