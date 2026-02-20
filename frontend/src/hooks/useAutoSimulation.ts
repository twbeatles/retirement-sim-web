import { useEffect, useMemo, useRef } from "react";
import type { SimulationInput, SimulationRunOptions } from "../logic/types";

type ViewMode = "simple" | "pro";

type UseAutoSimulationParams = {
  input: SimulationInput;
  viewMode: ViewMode;
  runSimulation: (input: SimulationInput, options?: SimulationRunOptions) => Promise<unknown>;
};

const PREVIEW_DELAY_MS = 150;
const FULL_IDLE_DELAY_MS = 900;

function buildPreviewOptions(viewMode: ViewMode): SimulationRunOptions {
  return {
    detailLevel: "preview",
    previewPathCap: viewMode === "simple" ? 64 : 80,
    includeSampleTimelines: false,
    includeTrajectoryStats: false,
    includeSurvivalSeries: false,
    maxSampleTimelines: 0
  };
}

function buildFullOptions(viewMode: ViewMode): SimulationRunOptions {
  if (viewMode === "simple") {
    return {
      detailLevel: "full",
      includeSampleTimelines: false,
      includeTrajectoryStats: false,
      includeSurvivalSeries: false,
      maxSampleTimelines: 0
    };
  }

  return {
    detailLevel: "full",
    includeSampleTimelines: true,
    includeTrajectoryStats: true,
    includeSurvivalSeries: true,
    maxSampleTimelines: 3
  };
}

export function useAutoSimulation({ input, viewMode, runSimulation }: UseAutoSimulationParams) {
  const requestSeqRef = useRef(0);
  const previewOptions = useMemo(() => buildPreviewOptions(viewMode), [viewMode]);
  const fullOptions = useMemo(() => buildFullOptions(viewMode), [viewMode]);

  useEffect(() => {
    const currentSeq = ++requestSeqRef.current;

    const previewTimer = window.setTimeout(() => {
      if (currentSeq !== requestSeqRef.current) {
        return;
      }
      void runSimulation(input, previewOptions).catch((error) => {
        console.error("Preview simulation failed:", error);
      });
    }, PREVIEW_DELAY_MS);

    const fullTimer = window.setTimeout(() => {
      if (currentSeq !== requestSeqRef.current) {
        return;
      }
      void runSimulation(input, fullOptions).catch((error) => {
        console.error("Full simulation failed:", error);
      });
    }, FULL_IDLE_DELAY_MS);

    return () => {
      window.clearTimeout(previewTimer);
      window.clearTimeout(fullTimer);
    };
  }, [fullOptions, input, previewOptions, runSimulation]);
}
