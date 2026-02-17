import type {
    SensitivityResult,
    SimulationInput,
    SimulationResult,
    SimulationRunOptions
} from "./types";
import type {
    PensionOptimizationResult,
    WorkerRequest,
    WorkerRequestKind,
    WorkerResponse,
    WorkerResponseByKind
} from "./workerTypes";

type PendingEntry = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
};

let workerInstance: Worker | null = null;
let sequence = 0;
const pending = new Map<string, PendingEntry>();

function ensureWorker(): Worker {
    if (workerInstance) {
        return workerInstance;
    }

    workerInstance = new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" });

    workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const entry = pending.get(response.requestId);
        if (!entry) {
            return;
        }

        pending.delete(response.requestId);

        if (response.status === "success") {
            entry.resolve(response.payload);
            return;
        }

        entry.reject(new Error(response.error));
    };

    workerInstance.onerror = (event) => {
        const message = event.message || "Unknown worker error";
        const error = new Error(message);
        for (const entry of pending.values()) {
            entry.reject(error);
        }
        pending.clear();
    };

    return workerInstance;
}

function nextRequestId(kind: WorkerRequestKind): string {
    sequence += 1;
    return `${kind}-${Date.now()}-${sequence}`;
}

export function sendWorkerRequest<K extends WorkerRequestKind>(
    kind: K,
    payload: WorkerRequest<K>["payload"]
): Promise<WorkerResponseByKind[K]> {
    const worker = ensureWorker();
    const requestId = nextRequestId(kind);

    const request: WorkerRequest<K> = {
        requestId,
        kind,
        payload
    };

    return new Promise<WorkerResponseByKind[K]>((resolve, reject) => {
        pending.set(requestId, {
            resolve: resolve as (value: unknown) => void,
            reject
        });
        worker.postMessage(request);
    });
}

export function requestSimulation(
    input: SimulationInput,
    options?: SimulationRunOptions
): Promise<SimulationResult> {
    return sendWorkerRequest("SIMULATION", { input, options });
}

export function requestSimulationBatch(
    inputs: SimulationInput[],
    options?: SimulationRunOptions
): Promise<SimulationResult[]> {
    return sendWorkerRequest("SIMULATION_BATCH", { inputs, options });
}

export function requestSolveContribution(
    input: SimulationInput,
    targetSuccessRate: number
): Promise<number | null> {
    return sendWorkerRequest("SOLVE_CONTRIBUTION", { input, targetSuccessRate });
}

export function requestSolveRetireAge(
    input: SimulationInput,
    targetSuccessRate: number
): Promise<number | null> {
    return sendWorkerRequest("SOLVE_RETIRE_AGE", { input, targetSuccessRate });
}

export function requestSensitivityAnalysis(
    input: SimulationInput,
    parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
    variations: number[]
): Promise<SensitivityResult> {
    return sendWorkerRequest("SENSITIVITY_ANALYSIS", { input, parameter, variations });
}

export function requestPensionOptimization(
    input: SimulationInput
): Promise<PensionOptimizationResult[]> {
    return sendWorkerRequest("PENSION_OPTIMIZATION", { input });
}

export function terminateSimulationWorker(): void {
    if (!workerInstance) {
        return;
    }

    workerInstance.terminate();
    workerInstance = null;
    pending.clear();
}
