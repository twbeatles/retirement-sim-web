import type { SimulationInput, TimelineRow } from "../types";
import { randomNormal, setSeed } from "../math";
import type { SimulationContext } from "./types";
import { simulateOnePath } from "./pathSimulation";
export function replayHistoricalPath(
    input: SimulationInput,
    ctx: SimulationContext,
    pathIndex: number
): TimelineRow[] {
    return simulateOnePath(input, ctx, false, pathIndex, { captureTimeline: true }).timeline;
}

export function replayMonteCarloPath(
    input: SimulationInput,
    ctx: SimulationContext,
    targetIndex: number
): TimelineRow[] {
    setSeed(input.simulation_settings.seed);

    let captured: TimelineRow[] = [];

    for (let pathIndex = 0; pathIndex <= targetIndex; pathIndex++) {
        let pathEndAge = input.end_age;
        if (input.longevity_risk?.useDistribution) {
            const meanAge = input.longevity_risk.averageLifeExpectancy || 83.5;
            const stdDev = input.longevity_risk.stdDevYears || 5;
            pathEndAge = Math.round(meanAge + stdDev * randomNormal());
            pathEndAge = Math.max(input.retire_age + 1, Math.min(pathEndAge, 120));
        }

        const pathTotalMonths = (pathEndAge - input.current_age) * 12;
        const pathCtx = { ...ctx, totalMonths: pathTotalMonths };
        const simulation = simulateOnePath(input, pathCtx, true, undefined, {
            captureTimeline: pathIndex === targetIndex,
            trajectoryLength: ctx.totalMonths
        });

        if (pathIndex === targetIndex) {
            captured = simulation.timeline;
        }
    }

    return captured;
}

