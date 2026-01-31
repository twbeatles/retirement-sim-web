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
