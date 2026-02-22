import {
    SimulationInput,
    SimulationResult,
    SensitivityResult,
    SimulationRunOptions
} from "./types";

export type WorkerRequestKind =
    | "SIMULATION"
    | "SIMULATION_BATCH"
    | "SOLVE_CONTRIBUTION"
    | "SOLVE_RETIRE_AGE"
    | "SENSITIVITY_ANALYSIS"
    | "PENSION_OPTIMIZATION";

export type SimulationRequestPriority = "preview" | "full";
export type WorkerLane = "interactive" | "compute";

export type WorkerLaneQueueMeta = {
    lane: WorkerLane;
    priority: SimulationRequestPriority;
    inFlightRequestId: string | null;
    queuedRequestId: string | null;
    queuedConsumerCount: number;
};

export type SimulationRequestPayload = {
    input: SimulationInput;
    options?: SimulationRunOptions;
};

export type SimulationBatchRequestPayload = {
    inputs: SimulationInput[];
    options?: SimulationRunOptions;
};

export type SolveContributionRequestPayload = {
    input: SimulationInput;
    targetSuccessRate: number;
};

export type SolveRetireAgeRequestPayload = {
    input: SimulationInput;
    targetSuccessRate: number;
};

export type SensitivityAnalysisRequestPayload = {
    input: SimulationInput;
    parameter: "annual_return" | "annual_inflation" | "withdrawal_rate";
    variations: number[];
};

export type PensionOptimizationResult = {
    age: number;
    totalPayout: number;
    npv: number;
    successRate: number;
    breakEvenPoint?: number;
};

export type PensionOptimizationRequestPayload = {
    input: SimulationInput;
};

export type WorkerRequestByKind = {
    SIMULATION: SimulationRequestPayload;
    SIMULATION_BATCH: SimulationBatchRequestPayload;
    SOLVE_CONTRIBUTION: SolveContributionRequestPayload;
    SOLVE_RETIRE_AGE: SolveRetireAgeRequestPayload;
    SENSITIVITY_ANALYSIS: SensitivityAnalysisRequestPayload;
    PENSION_OPTIMIZATION: PensionOptimizationRequestPayload;
};

export type WorkerResponseByKind = {
    SIMULATION: SimulationResult;
    SIMULATION_BATCH: SimulationResult[];
    SOLVE_CONTRIBUTION: number | null;
    SOLVE_RETIRE_AGE: number | null;
    SENSITIVITY_ANALYSIS: SensitivityResult;
    PENSION_OPTIMIZATION: PensionOptimizationResult[];
};

export type WorkerRequest<K extends WorkerRequestKind = WorkerRequestKind> = {
    requestId: string;
    kind: K;
    payload: WorkerRequestByKind[K];
};

export type AnyWorkerRequest = {
    [K in WorkerRequestKind]: WorkerRequest<K>;
}[WorkerRequestKind];

export type WorkerSuccessResponse<K extends WorkerRequestKind = WorkerRequestKind> = {
    requestId: string;
    kind: K;
    status: "success";
    payload: WorkerResponseByKind[K];
};

export type AnyWorkerSuccessResponse = {
    [K in WorkerRequestKind]: WorkerSuccessResponse<K>;
}[WorkerRequestKind];

export type WorkerErrorResponse = {
    requestId: string;
    kind: WorkerRequestKind;
    status: "error";
    error: string;
};

export type WorkerResponse<K extends WorkerRequestKind = WorkerRequestKind> =
    | WorkerSuccessResponse<K>
    | WorkerErrorResponse;
