import { SimulationInput, SimulationResult, SensitivityResult } from "./types";

// Request Types
export type SimulationRequest = {
    type: 'SIMULATION';
    input: SimulationInput;
};

export type SolveContributionRequest = {
    type: 'SOLVE_CONTRIBUTION';
    input: SimulationInput;
    targetSuccessRate: number;
};

export type SolveRetireAgeRequest = {
    type: 'SOLVE_RETIRE_AGE';
    input: SimulationInput;
    targetSuccessRate: number;
};

export type SensitivityAnalysisRequest = {
    type: 'SENSITIVITY_ANALYSIS';
    input: SimulationInput;
    parameter: 'annual_return' | 'annual_inflation' | 'withdrawal_rate';
    variations: number[];
};

export type WorkerRequest =
    | SimulationRequest
    | SolveContributionRequest
    | SolveRetireAgeRequest
    | SensitivityAnalysisRequest;

// Response Types
export type SuccessResponse = {
    type: 'SUCCESS';
    payload: SimulationResult | number | SensitivityResult[]; // SimulationResult for SIMULATION, number for solvers, SensitivityResult[] for sensitivity
};

export type ErrorResponse = {
    type: 'ERROR';
    payload: string;
};

export type WorkerResponse = SuccessResponse | ErrorResponse;
