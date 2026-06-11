import { useEffect, useMemo, useRef, useState } from "react";
import type { SimulationInput, SimulationRunOptions } from "../logic/types";
import {
  createPreviewSimulationOptions,
  createSimulationFingerprint
} from "../logic/simulationRequestPolicy";

type ViewMode = "simple" | "pro";

type UseAutoSimulationParams = {
  input: SimulationInput;
  viewMode: ViewMode;
  runSimulation: (input: SimulationInput, options?: SimulationRunOptions) => Promise<unknown>;
  hasBlockingValidationError: boolean;
};

const PREVIEW_DELAY_MS = 150;
const FULL_IDLE_DELAY_MS = 900;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function buildPreviewOptions(viewMode: ViewMode): SimulationRunOptions {
  return createPreviewSimulationOptions(viewMode === "simple" ? 64 : 80);
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

export function useAutoSimulation({ input, viewMode, runSimulation, hasBlockingValidationError }: UseAutoSimulationParams) {
  const requestSeqRef = useRef(0);
  const lastPreviewFingerprintRef = useRef<string | null>(null);
  const lastFullFingerprintRef = useRef<string | null>(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === "undefined") {
      return true;
    }
    return document.visibilityState === "visible";
  });

  const previewOptions = useMemo(() => buildPreviewOptions(viewMode), [viewMode]);
  const fullOptions = useMemo(() => buildFullOptions(viewMode), [viewMode]);
  const previewFingerprint = useMemo(
    () => createSimulationFingerprint(input, previewOptions),
    [input, previewOptions]
  );
  const fullFingerprint = useMemo(
    () => createSimulationFingerprint(input, fullOptions),
    [fullOptions, input]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (hasBlockingValidationError) {
      return;
    }

    const currentSeq = ++requestSeqRef.current;

    const previewTimer = window.setTimeout(() => {
      if (currentSeq !== requestSeqRef.current) {
        return;
      }
      if (previewFingerprint === lastPreviewFingerprintRef.current) {
        return;
      }

      lastPreviewFingerprintRef.current = previewFingerprint;
      void runSimulation(input, previewOptions).catch((error) => {
        if (lastPreviewFingerprintRef.current === previewFingerprint) {
          lastPreviewFingerprintRef.current = null;
        }
        if (isAbortError(error)) {
          return;
        }
        console.error("Preview simulation failed:", error);
      });
    }, PREVIEW_DELAY_MS);

    const fullTimer = window.setTimeout(() => {
      if (currentSeq !== requestSeqRef.current) {
        return;
      }
      if (!isVisible) {
        return;
      }
      if (fullFingerprint === lastFullFingerprintRef.current) {
        return;
      }

      lastFullFingerprintRef.current = fullFingerprint;
      void runSimulation(input, fullOptions).catch((error) => {
        if (lastFullFingerprintRef.current === fullFingerprint) {
          lastFullFingerprintRef.current = null;
        }
        if (isAbortError(error)) {
          return;
        }
        console.error("Full simulation failed:", error);
      });
    }, FULL_IDLE_DELAY_MS);

    return () => {
      window.clearTimeout(previewTimer);
      window.clearTimeout(fullTimer);
    };
  }, [
    fullFingerprint,
    fullOptions,
    input,
    isVisible,
    previewFingerprint,
    previewOptions,
    runSimulation,
    hasBlockingValidationError
  ]);
}
