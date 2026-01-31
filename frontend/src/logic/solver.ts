/**
 * Reverse Calculation Solver
 * Uses Binary Search to find simulation inputs that satisfy a target condition.
 */

import { SimulationInput, SimulationResult } from "./types";
import { runSimulation } from "./engine";

const MAX_ITERATIONS = 20;
const TOLERANCE = 0.01; // 1% difference in success rate or reasonable monetary epsilon

// Clone input helper
function cloneInput(input: SimulationInput): SimulationInput {
    // Deep clone is safer, but expensive. `structuredClone` is modern.
    return structuredClone(input);
}

/**
 * Solves for the required Monthly Contribution to achieve a target Success Rate.
 * Uses Binary Search.
 */
export function solveForMonthlyContribution(
    baseInput: SimulationInput,
    targetSuccessRate: number
): number | null {
    // Range: 0 to 20,000,000 (2000 Manwon) - Reasonable savings limits
    let low = 0;
    let high = 50000000; // Max 50 million won/month
    let sol = -1;

    // Fast settings for Solver
    const solverInput = cloneInput(baseInput);
    solverInput.simulation_settings.mc_paths = 100; // Lower paths for speed
    // Or use deterministic? No, we need probability.

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const mid = (low + high) / 2;
        solverInput.general.monthly_contribution = mid;

        const result = runSimulation(solverInput);
        const rate = result.summary.successRate;

        if (rate >= targetSuccessRate) {
            sol = mid;
            high = mid; // Try lower amount
        } else {
            low = mid; // Need more savings
        }

        // Optimization: If close enough?
        // But for binary search minimizing 'amount', we usually run to iterations or monetary tolerance.
        if (high - low < 10000) { // 10,000 won tolerance
            break;
        }
    }

    return sol !== -1 ? sol : null;
}

/**
 * Solves for the earliest Retirement Age to achieve a target Success Rate.
 */
export function solveForRetirementAge(
    baseInput: SimulationInput,
    targetSuccessRate: number
): number | null {
    // Range: Current Age to End Age
    let low = baseInput.current_age + 1;
    let high = baseInput.end_age;
    let sol = -1;

    // Fast settings
    const solverInput = cloneInput(baseInput);
    solverInput.simulation_settings.mc_paths = 100;

    // Binary search is valid here because Success Rate is monotonic with Retire Age (Later retire = More savings + Less period)

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const mid = Math.floor((low + high) / 2);

        if (mid === low) {
            // Check low, if success, return low. Else check high.
            // Binary search on integers needs care.
            solverInput.retire_age = low;
            let res = runSimulation(solverInput);
            if (res.summary.successRate >= targetSuccessRate) return low;

            solverInput.retire_age = high;
            res = runSimulation(solverInput);
            if (res.summary.successRate >= targetSuccessRate) return high;

            break;
        }

        solverInput.retire_age = mid;
        const result = runSimulation(solverInput);
        const rate = result.summary.successRate;

        if (rate >= targetSuccessRate) {
            sol = mid;
            high = mid; // Can we retire earlier?
        } else {
            low = mid + 1; // Need to retire later
        }

        if (low >= high) break;
    }

    // Final check
    if (sol !== -1) return sol;

    // Check 'low' one last time if loop broke early
    solverInput.retire_age = low;
    if (runSimulation(solverInput).summary.successRate >= targetSuccessRate) return low;

    return null;
}

/**
 * Calculates the optimal pension start age (60-70) based on total lifetime payout.
 * Also returns simulation success rates for each age.
 */
export function optimizePensionStartAge(
    baseInput: SimulationInput
): { age: number; totalPayout: number; npv: number; successRate: number; breakEvenPoint?: number }[] {

    const results: { age: number; totalPayout: number; npv: number; successRate: number; breakEvenPoint?: number }[] = [];

    // Test ages 60 to 70
    for (let age = 60; age <= 70; age++) {
        // Clone input
        const input = cloneInput(baseInput);

        input.national_pension.startAge = age;

        // Run optimized simulation (fewer paths for speed)
        input.simulation_settings.mc_paths = 200; // Fast run

        const res = runSimulation(input);

        // Calculate Total Lifetime Payout
        const lifeExpectancy = input.end_age;
        const yearsReceiving = Math.max(0, lifeExpectancy - age);

        // Base amount at 65
        const baseAmount = input.national_pension.expected_monthly_benefit_at_retirement || 0;

        // Calculate adjusted amount
        let multiplier = 1;
        const diff = age - 65;
        if (diff < 0) {
            multiplier = 1 + (diff * 0.06);
        } else {
            multiplier = 1 + (diff * 0.072);
        }

        const monthlyAmt = baseAmount * multiplier;
        // Calculate NPV (Net Present Value)
        // Discount Rate = Portfolio Expected Return (Nominal)
        // This represents the "Opportunity Cost" of not investing the money.
        // Formula: Sum [ MonthlyAmt / (1 + r)^m ]
        // Where m is months from NOW (current_age).
        // Pension starts at 'age' (which is startAge). 

        // Calculate Portfolio Expected Return
        let discountRateAnnual = 0.05; // default fallback
        if (baseInput.portfolio.assetClasses.length > 0) {
            const totalAlloc = baseInput.portfolio.assetClasses.reduce((acc, a) => acc + a.allocation, 0);
            if (totalAlloc > 0) {
                discountRateAnnual = baseInput.portfolio.assetClasses.reduce((acc, a) => acc + (a.expectedAnnualReturn * a.allocation), 0) / totalAlloc;
            }
        }
        const discountRateMonthly = Math.pow(1 + discountRateAnnual, 1 / 12) - 1;

        let npv = 0;
        const startMonthIndex = (age - input.current_age) * 12;
        const totalMonths = (input.end_age - input.current_age) * 12;

        // Optimize loop:
        // NPV = MonthlyAmt * Sum_{m=start}^{end} (1+R)^(-m)
        // Sum of geometric series? 
        // Let v = 1/(1+R). Sum m=S to E of v^m = v^S * (1 - v^(E-S+1)) / (1-v)
        if (discountRateMonthly !== 0) {
            const v = 1 / (1 + discountRateMonthly);
            const term1 = Math.pow(v, startMonthIndex);
            const count = Math.max(0, totalMonths - startMonthIndex);
            // Geometric series sum: a * (1 - r^n) / (1 - r)
            // Here 'a' is first term = MonthlyAmt * v^startMonth? No.
            // The payout is MonthlyAmt at month m.
            // PV(m) = MonthlyAmt * v^m

            // Wait, does 'MonthlyAmt' grow with inflation?
            // Yes, if input.national_pension.inflation_linked is true.
            // If linked, NominalAmt at month m = Base * (1+Inf)^m
            // Then PV(m) = Base * (1+Inf)^m / (1+Ret)^m = Base * ((1+Inf)/(1+Ret))^m
            // This is equivalent to discounting real amount by Real Return.

            // Let's assume input.national_pension.inflation_linked is true (standard).
            const inflationAnnual = input.annual_inflation;
            const inflationMonthly = Math.pow(1 + inflationAnnual, 1 / 12) - 1;

            let effectiveRate = 0;
            if (baseInput.national_pension.inflation_linked) {
                // Real Discount Rate approx
                const realReturn = (1 + discountRateMonthly) / (1 + inflationMonthly) - 1;
                effectiveRate = realReturn;
            } else {
                effectiveRate = discountRateMonthly;
            }

            // If effectiveRate is very close to 0?
            if (Math.abs(effectiveRate) < 0.000001) {
                npv = monthlyAmt * count; // Just sum of real value (which is constant baseAmount)
                // Wait 'monthlyAmt' calculated above includes start delay adjustment multiplier.
            } else {
                const w = 1 / (1 + effectiveRate);
                // Sum m=start to end of Base * w^m
                // = Base * w^start * (1 - w^count) / (1 - w)

                // Note: monthlyAmt variable from lines above is "Nominal Amount at startAge" in simple logic?
                // Actually `monthlyAmt` calculated above:
                // const monthlyAmt = baseAmount * multiplier;
                // This `monthlyAmt` is the 'Base Amount' adjusted for delay/early.
                // It is the amount received in specific month relative to inflation?
                // If inflation linked, this is the REAL amount (constant purchasing power).

                const factor = (Math.pow(w, startMonthIndex) * (1 - Math.pow(w, count))) / (1 - w);
                npv = monthlyAmt * factor;
            }
        } else {
            npv = totalPayout; // No discount
        }

        results.push({
            age,
            totalPayout,
            npv,
            successRate: res.summary.successRate,
        });
    }

    return results;
}
