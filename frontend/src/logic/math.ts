/**
 * Math and Statistical Utilities for Simulation
 * Replaces basic Numpy functionality needed for Monte Carlo simulation.
 */

// Seeded PRNG using the Mulberry32 algorithm.
// The generator state is an explicitly readable/writable module value so a
// Monte Carlo path can be replayed directly from its per-path checkpoint.
// The arithmetic below is intentionally identical to the previous closure
// version: the same seed produces the same bit-for-bit sequence.
let rngState: number | null = null; // null = use Math.random

// Initialize seeded random generator
export function setSeed(seed: number | undefined): void {
    if (seed !== undefined && seed !== null) {
        rngState = seed;
    } else {
        rngState = null;
    }
}

// Read the current generator state. Returns null in Math.random() fallback
// mode, where exact replay is impossible by construction.
export function snapshotRngState(): number | null {
    return rngState;
}

// Restore a state previously read with snapshotRngState. Passing null
// returns the generator to Math.random() fallback mode.
export function restoreRngState(state: number | null): void {
    rngState = state;
}

// Get random number [0, 1) - uses seeded generator if set
function getRandom(): number {
    const state = rngState;
    if (state === null) {
        return Math.random();
    }
    let t = state + 0x6D2B79F5;
    rngState = t;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// Box-Muller transform to generate standard normal distribution (mean=0, std=1)
export function randomNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = getRandom();
    while (v === 0) v = getRandom();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate random normal numbers directly into a typed array (hot path).
// Consumes the RNG in the exact same order as randomNormalArray.
export function randomNormalTypedArray(size: number, mean: number = 0, std: number = 1): Float64Array {
    const arr = new Float64Array(size); // Use Float64 for precision
    for (let i = 0; i < size; i++) {
        arr[i] = mean + std * randomNormal();
    }
    return arr;
}

// Generate an array of random normal numbers
export function randomNormalArray(size: number, mean: number = 0, std: number = 1): number[] {
    return Array.from(randomNormalTypedArray(size, mean, std));
}

// Calculate percentile
export function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return percentileSorted(sorted, p);
}

export function percentileSorted(sorted: ArrayLike<number>, p: number): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Calculate mean
export function mean(arr: number[]): number {
    return meanTyped(arr);
}

export function meanTyped(arr: ArrayLike<number>): number {
    if (arr.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum / arr.length;
}

// Compound Interest Utils
export function monthlyRateFromAnnual(annualRate: number): number {
    if (!Number.isFinite(annualRate) || annualRate <= -1) {
        throw new Error("Annual rate must be finite and greater than -100%.");
    }
    return Math.pow(1.0 + annualRate, 1.0 / 12.0) - 1.0;
}

export function annuityPayment(pv: number, annualRate: number, years: number): number {
    const n = years * 12;
    if (n <= 0 || pv <= 0) return 0.0;

    const i = monthlyRateFromAnnual(annualRate);
    if (Math.abs(i) < 1e-12) return pv / n;

    return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

// Variable Percentage Withdrawal (VPW)
// Formula: Rate = R / (1 - (1 + R)^-N)
// But strictly, VPW tables usually assume a specific schedule.
// We will use the formulaic approach which adapts exactly to the parameters.
export function calculateVPWRate(
    age: number,
    endAge: number,
    portfolioReturnReal: number, // Expected Real Return of Portfolio
    // limitChange?: boolean // Not implemented yet
): number {
    const yearsRemaining = endAge - age + 1; // +1 to include current year? Usually runs until endAge.

    if (yearsRemaining <= 0) return 1.0; // Withdraw everything if past end age

    // If return is 0, it's just 1/N
    if (Math.abs(portfolioReturnReal) < 1e-9) {
        return 1.0 / yearsRemaining;
    }

    const r = portfolioReturnReal;
    const n = yearsRemaining;

    // PMT formula for $1 PV.
    // Payment = PV * [ r(1+r)^n ] / [ (1+r)^n - 1 ]
    // Rate = Payment / PV = [ r(1+r)^n ] / [ (1+r)^n - 1 ]
    //      = r / [ 1 - (1+r)^-n ]

    const rate = r / (1.0 - Math.pow(1.0 + r, -n));
    return rate;
}
