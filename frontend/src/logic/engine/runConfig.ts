import type { SimulationRunOptions } from "../types";

export type SimulationRunConfig = {
    detailLevel: NonNullable<SimulationRunOptions["detailLevel"]>;
    isPreview: boolean;
    includeSampleTimelines: boolean;
    includeTrajectoryStats: boolean;
    includeSurvivalSeries: boolean;
    maxSampleTimelines: number;
    previewPathCap: number;
};

export function resolveSimulationRunConfig(options?: SimulationRunOptions): SimulationRunConfig {
    const detailLevel = options?.detailLevel ?? "full";
    const isPreview = detailLevel === "preview";

    return {
        detailLevel,
        isPreview,
        includeSampleTimelines: options?.includeSampleTimelines ?? !isPreview,
        includeTrajectoryStats: options?.includeTrajectoryStats ?? !isPreview,
        includeSurvivalSeries: options?.includeSurvivalSeries ?? !isPreview,
        maxSampleTimelines: Math.max(0, options?.maxSampleTimelines ?? (isPreview ? 1 : 3)),
        previewPathCap: options?.previewPathCap ?? 80
    };
}
