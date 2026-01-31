import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationInput, SimulationResult, SensitivityResult } from '../logic/types';
import { WorkerRequest, WorkerResponse } from '../logic/workerTypes';

type SimulationHookReturn = {
    runSimulation: (input: SimulationInput) => void;
    solveContribution: (input: SimulationInput, targetSuccessRate: number) => void;
    solveRetireAge: (input: SimulationInput, targetSuccessRate: number) => void;
    runSensitivityAnalysis: (input: SimulationInput, parameter: 'annual_return' | 'annual_inflation' | 'withdrawal_rate', variations: number[]) => void;
    isCalculating: boolean;
    result: SimulationResult | null;
    sensitivityResults: SensitivityResult[] | null;
    error: string | null;
};

export function useSimulation(): SimulationHookReturn {
    const workerRef = useRef<Worker | null>(null);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize Worker
    useEffect(() => {
        // Create worker instance
        // Note: URL path depends on bundler (Vite).
        workerRef.current = new Worker(new URL('../logic/simulation.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { type, payload } = event.data;

            if (type === 'SUCCESS') {
                setIsCalculating(false);
                setError(null);

                // Distinguish between result types
                if (typeof payload === 'object' && payload !== null) {
                    if ('summary' in payload) {
                        // SimulationResult
                        setResult(payload as SimulationResult);
                    } else if (Array.isArray(payload) && payload.length > 0 && 'parameter' in payload[0]) {
                        // SensitivityResult[]
                        setSensitivityResults(payload as SensitivityResult[]);
                        window.dispatchEvent(new CustomEvent('SENSITIVITY_RESULT', { detail: payload }));
                    } else {
                        // Could be solver result (number) wrapped in object - dispatch event
                        window.dispatchEvent(new CustomEvent('SOLVER_RESULT', { detail: payload }));
                    }
                } else if (typeof payload === 'number') {
                    // Solver result
                    window.dispatchEvent(new CustomEvent('SOLVER_RESULT', { detail: payload }));
                }
            } else if (type === 'ERROR') {
                console.error("Simulation Worker Error:", payload);
                setError(typeof payload === 'string' ? payload : JSON.stringify(payload));
                setIsCalculating(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    const postMessage = useCallback((message: WorkerRequest) => {
        if (workerRef.current) {
            setIsCalculating(true);
            workerRef.current.postMessage(message);
        } else {
            console.error("Worker is not initialized");
        }
    }, []);

    const runSimulation = useCallback((input: SimulationInput) => {
        postMessage({ type: 'SIMULATION', input });
    }, [postMessage]);

    const solveContribution = useCallback((input: SimulationInput, targetSuccessRate: number) => {
        postMessage({ type: 'SOLVE_CONTRIBUTION', input, targetSuccessRate });
    }, [postMessage]);

    const solveRetireAge = useCallback((input: SimulationInput, targetSuccessRate: number) => {
        postMessage({ type: 'SOLVE_RETIRE_AGE', input, targetSuccessRate });
    }, [postMessage]);

    const runSensitivityAnalysisFunc = useCallback((
        input: SimulationInput,
        parameter: 'annual_return' | 'annual_inflation' | 'withdrawal_rate',
        variations: number[]
    ) => {
        postMessage({ type: 'SENSITIVITY_ANALYSIS', input, parameter, variations });
    }, [postMessage]);

    return {
        runSimulation,
        solveContribution,
        solveRetireAge,
        runSensitivityAnalysis: runSensitivityAnalysisFunc,
        isCalculating,
        result,
        sensitivityResults,
        error
    };
}
