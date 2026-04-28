import type {
    LedgerTimelineRow,
    SimulationDisplayPath,
    SimulationResult,
    TimelineRow
} from "./types";

function createFallbackRepresentative(result: SimulationResult): SimulationDisplayPath | undefined {
    if (result.mode === "deterministic") {
        return {
            label: "대표 경로",
            pathIndex: null,
            timeline: result.timeline,
            ledgerTimeline: result.ledgerTimeline
        };
    }

    if (result.sampleTimelines.length === 0) {
        return undefined;
    }

    return {
        label: "대표 경로",
        pathIndex: 0,
        timeline: result.sampleTimelines[0],
        ledgerTimeline: result.ledgerTimeline
    };
}

export function getRepresentativePath(result: SimulationResult): SimulationDisplayPath | undefined {
    return result.display.representative ?? createFallbackRepresentative(result);
}

export function getRepresentativeTimeline(result: SimulationResult): TimelineRow[] {
    return getRepresentativePath(result)?.timeline ?? [];
}

export function getRepresentativeLedgerTimeline(result: SimulationResult): LedgerTimelineRow[] {
    return getRepresentativePath(result)?.ledgerTimeline ?? result.ledgerTimeline ?? [];
}

export function getSampleDisplayPaths(result: SimulationResult): SimulationDisplayPath[] {
    if (result.display.samples.length > 0) {
        return result.display.samples;
    }

    if (result.mode === "deterministic") {
        return [];
    }

    return result.sampleTimelines.map((timeline, index) => ({
        label: `샘플 경로 ${index + 1}`,
        pathIndex: index,
        timeline
    }));
}
