import { useRef, useState, useCallback } from "react";
import {
    SensitivityResult,
    SimulationInput,
    SimulationResult,
    SimulationRunOptions
} from "../logic/types";
import {
    requestSensitivityAnalysis,
    requestSimulation,
    requestSolveContribution,
    requestSolveRetireAge
} from "../logic/simulationClient";

type SimulationHookReturn = {
    runSimulation: (input: SimulationInput, options?: SimulationRunOptions) => Promise<SimulationResult>;
    runSimulationPreview: (input: SimulationInput, previewPathCap?: number) => Promise<SimulationResult>;
    solveContribution: (input: SimulationInput, targetSuccessRate: number) => Promise<number | null>;
    solveRetireAge: (input: SimulationInput, targetSuccessRate: number) => Promise<number | null>;
    runSensitivityAnalysis: (
        input: SimulationInput,
        parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
        variations: number[]
    ) => Promise<SensitivityResult>;
    isCalculating: boolean;
    result: SimulationResult | null;
    sensitivityResults: SensitivityResult[] | null;
    error: string | null;
};

export function useSimulation(): SimulationHookReturn {
    const latestSimulationSeq = useRef(0);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runSimulation = useCallback(async (input: SimulationInput, options?: SimulationRunOptions) => {
        const seq = ++latestSimulationSeq.current;
        setIsCalculating(true);

        try {
            const response = await requestSimulation(input, options);
            if (seq === latestSimulationSeq.current) {
                setResult(response);
                setError(null);
            }
            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (seq === latestSimulationSeq.current) {
                setError(message);
            }
            throw err;
        } finally {
            if (seq === latestSimulationSeq.current) {
                setIsCalculating(false);
            }
        }
    }, []);

    const runSimulationPreview = useCallback((input: SimulationInput, previewPathCap = 80) => {
        return requestSimulation(input, {
            detailLevel: "preview",
            previewPathCap,
            includeSampleTimelines: false,
            includeTrajectoryStats: false,
            includeSurvivalSeries: false,
            maxSampleTimelines: 0
        });
    }, []);

    const solveContribution = useCallback((input: SimulationInput, targetSuccessRate: number) => {
        return requestSolveContribution(input, targetSuccessRate);
    }, []);

    const solveRetireAge = useCallback((input: SimulationInput, targetSuccessRate: number) => {
        return requestSolveRetireAge(input, targetSuccessRate);
    }, []);

    const runSensitivityAnalysisFunc = useCallback(
        async (
            input: SimulationInput,
            parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
            variations: number[]
        ) => {
            const sensitivity = await requestSensitivityAnalysis(input, parameter, variations);
            setSensitivityResults((prev) => {
                if (!prev) {
                    return [sensitivity];
                }
                const rest = prev.filter((item) => item.parameter !== sensitivity.parameter);
                return [...rest, sensitivity];
            });
            return sensitivity;
        },
        []
    );

    return {
        runSimulation,
        runSimulationPreview,
        solveContribution,
        solveRetireAge,
        runSensitivityAnalysis: runSensitivityAnalysisFunc,
        isCalculating,
        result,
        sensitivityResults,
        error
    };
}
