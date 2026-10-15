import type { SimulationInput, TimelineRow } from "../types";
import { randomNormal, restoreRngState, setSeed } from "../math";
import type { PathSimulationOptions, PathSimulationResult, SimulationContext } from "./types";
import { simulateOnePath } from "./pathSimulation";
export function replayHistoricalPath(
    input: SimulationInput,
    ctx: SimulationContext,
    pathIndex: number
): TimelineRow[] {
    return simulateOnePath(input, ctx, false, pathIndex, { captureTimeline: true }).timeline;
}

// Runs one Monte Carlo path exactly as the main simulation loop does:
// longevity draw first (when enabled), then the path simulation itself.
// Shared by the legacy replay loop, the checkpoint replay, and (via
// runSimulation) the main loop so all three consume the RNG identically.
export function simulateMonteCarloPathOnce(
    input: SimulationInput,
    ctx: SimulationContext,
    runOptions: PathSimulationOptions
): PathSimulationResult {
    let pathEndAge = input.end_age;
    if (input.longevity_risk?.useDistribution) {
        const meanAge = input.longevity_risk.averageLifeExpectancy || 83.5;
        const stdDev = input.longevity_risk.stdDevYears || 5;
        pathEndAge = Math.round(meanAge + stdDev * randomNormal());
        pathEndAge = Math.max(input.retire_age + 1, Math.min(pathEndAge, 120));
    }

    const pathTotalMonths = (pathEndAge - input.current_age) * 12;
    const pathCtx = { ...ctx, totalMonths: pathTotalMonths };
    return simulateOnePath(input, pathCtx, true, undefined, {
        ...runOptions,
        trajectoryLength: runOptions.trajectoryLength ?? ctx.totalMonths
    });
}

export type MonteCarloRngCheckpoints = Array<number | null>;

export function captureMonteCarloCheckpoints(pathCount: number): MonteCarloRngCheckpoints {
    return new Array<number | null>(pathCount).fill(null);
}

export function replayMonteCarloPath(
    input: SimulationInput,
    ctx: SimulationContext,
    targetIndex: number,
    checkpoints?: MonteCarloRngCheckpoints
): TimelineRow[] {
    // Fast path: restore the RNG state captured just before this path's first
    // draw in the main run, then execute the single path directly. Falls back
    // to the legacy loop when no usable checkpoint exists (e.g. unseeded
    // Math.random() mode, where exact replay is impossible).
    const checkpoint = checkpoints?.[targetIndex];
    if (checkpoint !== undefined && checkpoint !== null) {
        restoreRngState(checkpoint);
        return simulateMonteCarloPathOnce(input, ctx, { captureTimeline: true }).timeline;
    }

    setSeed(input.simulation_settings.seed);

    let captured: TimelineRow[] = [];

    for (let pathIndex = 0; pathIndex <= targetIndex; pathIndex++) {
        const simulation = simulateMonteCarloPathOnce(input, ctx, {
            captureTimeline: pathIndex === targetIndex
        });

        if (pathIndex === targetIndex) {
            captured = simulation.timeline;
        }
    }

    return captured;
}
