import { useRef, useState, useCallback } from "react";
import {
    type SensitivityResult,
    type SimulationInput,
    type SimulationResult,
    type SimulationRunOptions
} from "../logic/types";
import { legacyInputToPlanV2 } from "../logic/planV2";
import { createPreviewSimulationOptions } from "../logic/simulationRequestPolicy";

type SimulationHookReturn = {
    runSimulation: (input: SimulationInput, options?: SimulationRunOptions) => Promise<SimulationResult>;
    runSimulationPreview: (input: SimulationInput, previewPathCap?: number) => Promise<SimulationResult>;
    solveContribution: (input: SimulationInput, targetSuccessRate: number) => Promise<number | null>;
    solveLaborSavingsRate: (input: SimulationInput, targetSuccessRate: number) => Promise<number | null>;
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

type SimulationClientModule = typeof import("../logic/simulationClient");

let simulationClientPromise: Promise<SimulationClientModule> | null = null;

function loadSimulationClient(): Promise<SimulationClientModule> {
    if (!simulationClientPromise) {
        simulationClientPromise = import("../logic/simulationClient");
    }
    return simulationClientPromise;
}

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
            const detailLevel = options?.detailLevel ?? "full";
            const client = await loadSimulationClient();
            const response = detailLevel === "preview"
                ? await client.requestSimulation(input, options)
                : await client.requestSimulationPlan(legacyInputToPlanV2(input), options);
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
        return loadSimulationClient().then(({ requestSimulation }) =>
            requestSimulation(input, createPreviewSimulationOptions(previewPathCap))
        );
    }, []);

    const solveContribution = useCallback(async (input: SimulationInput, targetSuccessRate: number) => {
        const { requestSolveContribution } = await loadSimulationClient();
        return requestSolveContribution(input, targetSuccessRate);
    }, []);

    const solveLaborSavingsRate = useCallback(async (input: SimulationInput, targetSuccessRate: number) => {
        const { requestSolveLaborSavingsRate } = await loadSimulationClient();
        return requestSolveLaborSavingsRate(input, targetSuccessRate);
    }, []);

    const solveRetireAge = useCallback(async (input: SimulationInput, targetSuccessRate: number) => {
        const { requestSolveRetireAge } = await loadSimulationClient();
        return requestSolveRetireAge(input, targetSuccessRate);
    }, []);

    const runSensitivityAnalysisFunc = useCallback(
        async (
            input: SimulationInput,
            parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
            variations: number[]
        ) => {
            const { requestSensitivityAnalysis } = await loadSimulationClient();
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
        solveLaborSavingsRate,
        solveRetireAge,
        runSensitivityAnalysis: runSensitivityAnalysisFunc,
        isCalculating,
        result,
        sensitivityResults,
        error
    };
}
