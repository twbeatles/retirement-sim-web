import type { SimulationInput, SimulationRunOptions } from "./types";

export function createPreviewSimulationOptions(previewPathCap: number): SimulationRunOptions {
    return {
        detailLevel: "preview",
        previewPathCap,
        includeSampleTimelines: false,
        includeTrajectoryStats: false,
        includeSurvivalSeries: false,
        maxSampleTimelines: 0
    };
}

function sortObjectKeys(value: unknown): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        const item = (value as Record<string, unknown>)[key];
        if (item !== undefined) {
            sorted[key] = item;
        }
    }
    return sorted;
}

export function createSimulationFingerprint(
    input: SimulationInput,
    options?: SimulationRunOptions
): string {
    return JSON.stringify(
        { input, options: options ?? null },
        (_key, value) => sortObjectKeys(value)
    );
}
