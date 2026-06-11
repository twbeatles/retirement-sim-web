import { useRef, useState, useCallback } from "react";
import {
    type SensitivityResult,
    type SimulationInput,
    type SimulationResult,
    type SimulationRunOptions
} from "../logic/types";
import { legacyInputToPlan } from "../logic/plan";
import { createPreviewSimulationOptions } from "../logic/simulationRequestPolicy";

type SimulationHookReturn = {
    runSimulation: (input: SimulationInput, options?: SimulationRunOptions) => Promise<SimulationResult>;
    runSimulationPreview: (input: SimulationInput, previewPathCap?: number) => Promise<SimulationResult>;
    clearResult: () => void;
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

type SimulationClientModule = {
    requestSimulation: (plan: ReturnType<typeof legacyInputToPlan>, options?: SimulationRunOptions) => Promise<SimulationResult>;
    requestSolveContribution: (plan: ReturnType<typeof legacyInputToPlan>, targetSuccessRate: number) => Promise<number | null>;
    requestSolveLaborSavingsRate: (plan: ReturnType<typeof legacyInputToPlan>, targetSuccessRate: number) => Promise<number | null>;
    requestSolveRetireAge: (plan: ReturnType<typeof legacyInputToPlan>, targetSuccessRate: number) => Promise<number | null>;
    requestSensitivityAnalysis: (
        plan: ReturnType<typeof legacyInputToPlan>,
        parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
        variations: number[]
    ) => Promise<SensitivityResult>;
    isSimulationAbortError?: (error: unknown) => boolean;
};

let simulationClientPromise: Promise<SimulationClientModule> | null = null;

function loadSimulationClient(): Promise<SimulationClientModule> {
    if (!simulationClientPromise) {
        simulationClientPromise = import("../logic/simulationClient") as Promise<SimulationClientModule>;
    }
    return simulationClientPromise!;
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
        setError(null);
        let client: SimulationClientModule | null = null;

        try {
            client = await loadSimulationClient();
            const response = await client.requestSimulation(legacyInputToPlan(input), options);
            if (seq === latestSimulationSeq.current) {
                setResult(response);
                setError(null);
            }
            return response;
        } catch (err) {
            if (client?.isSimulationAbortError?.(err)) {
                throw err;
            }
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

    const clearResult = useCallback(() => {
        latestSimulationSeq.current++;
        setResult(null);
        setError(null);
        setIsCalculating(false);
    }, []);

    const runSimulationPreview = useCallback((input: SimulationInput, previewPathCap = 80) => {
        return loadSimulationClient().then(({ requestSimulation }) =>
            requestSimulation(legacyInputToPlan(input), createPreviewSimulationOptions(previewPathCap))
        );
    }, []);

    const solveContribution = useCallback(async (input: SimulationInput, targetSuccessRate: number) => {
        const { requestSolveContribution } = await loadSimulationClient();
        return requestSolveContribution(legacyInputToPlan(input), targetSuccessRate);
    }, []);

    const solveLaborSavingsRate = useCallback(async (input: SimulationInput, targetSuccessRate: number) => {
        const { requestSolveLaborSavingsRate } = await loadSimulationClient();
        return requestSolveLaborSavingsRate(legacyInputToPlan(input), targetSuccessRate);
    }, []);

    const solveRetireAge = useCallback(async (input: SimulationInput, targetSuccessRate: number) => {
        const { requestSolveRetireAge } = await loadSimulationClient();
        return requestSolveRetireAge(legacyInputToPlan(input), targetSuccessRate);
    }, []);

    const runSensitivityAnalysisFunc = useCallback(
        async (
            input: SimulationInput,
            parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
            variations: number[]
        ) => {
            const { requestSensitivityAnalysis } = await loadSimulationClient();
            const sensitivity = await requestSensitivityAnalysis(legacyInputToPlan(input), parameter, variations);
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
        clearResult,
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
