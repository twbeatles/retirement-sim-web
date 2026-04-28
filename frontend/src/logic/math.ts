/**
 * Math and Statistical Utilities for Simulation
 * Replaces basic Numpy functionality needed for Monte Carlo simulation.
 */

// Seeded PRNG using Mulberry32 algorithm
// Returns a function that generates random numbers [0, 1)
function mulberry32(seed: number): () => number {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Global seeded random generator (null = use Math.random)
let seededRandom: (() => number) | null = null;

// Initialize seeded random generator
export function setSeed(seed: number | undefined): void {
    if (seed !== undefined && seed !== null) {
        seededRandom = mulberry32(seed);
    } else {
        seededRandom = null;
    }
}

// Get random number [0, 1) - uses seeded generator if set
function getRandom(): number {
    return seededRandom ? seededRandom() : Math.random();
}

// Box-Muller transform to generate standard normal distribution (mean=0, std=1)
export function randomNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = getRandom();
    while (v === 0) v = getRandom();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate an array of random normal numbers
export function randomNormalArray(size: number, mean: number = 0, std: number = 1): number[] {
    const arr = new Float64Array(size); // Use Float64 for precision
    for (let i = 0; i < size; i++) {
        arr[i] = mean + std * randomNormal();
    }
    return Array.from(arr);
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
