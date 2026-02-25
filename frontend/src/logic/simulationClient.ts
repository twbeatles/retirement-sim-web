import type {
    SensitivityResult,
    SimulationDetailLevel,
    SimulationInput,
    SimulationResult,
    SimulationRunOptions
} from "./types";
import type {
    PensionOptimizationResult,
    SimulationRequestPriority,
    WorkerLane,
    WorkerRequest,
    WorkerRequestByKind,
    WorkerRequestKind,
    WorkerResponse,
    WorkerResponseByKind
} from "./workerTypes";

type PendingEntry = {
    lane: WorkerLane;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onSettled?: () => void;
};

type SimulationConsumer = {
    resolve: (value: SimulationResult) => void;
    reject: (error: Error) => void;
};

type CoalescedSimulationJob = {
    requestId: string;
    payload: WorkerRequestByKind["SIMULATION"];
    consumers: SimulationConsumer[];
};

type CoalescingState = {
    lane: WorkerLane;
    priority: SimulationRequestPriority;
    inFlight: CoalescedSimulationJob | null;
    queued: CoalescedSimulationJob | null;
};

const workers: Record<WorkerLane, Worker | null> = {
    interactive: null,
    compute: null
};
let sequence = 0;
const pending = new Map<string, PendingEntry>();

const coalescing: Record<SimulationRequestPriority, CoalescingState> = {
    preview: {
        lane: "interactive",
        priority: "preview",
        inFlight: null,
        queued: null
    },
    full: {
        lane: "compute",
        priority: "full",
        inFlight: null,
        queued: null
    }
};

function nextRequestId(kind: WorkerRequestKind, lane: WorkerLane): string {
    sequence += 1;
    return `${lane}-${kind}-${Date.now()}-${sequence}`;
}

function normalizeDetailLevel(options?: SimulationRunOptions): SimulationDetailLevel {
    return options?.detailLevel ?? "full";
}

function priorityFromOptions(options?: SimulationRunOptions): SimulationRequestPriority {
    return normalizeDetailLevel(options) === "preview" ? "preview" : "full";
}

function settlePendingForLane(lane: WorkerLane, error: Error): void {
    for (const [requestId, entry] of pending.entries()) {
        if (entry.lane !== lane) {
            continue;
        }
        pending.delete(requestId);
        entry.reject(error);
        entry.onSettled?.();
    }
}

function clearQueuedSimulationForLane(lane: WorkerLane, error: Error): void {
    for (const state of Object.values(coalescing)) {
        if (state.lane !== lane) {
            continue;
        }

        if (state.queued) {
            const queued = state.queued;
            state.queued = null;
            for (const consumer of queued.consumers) {
                consumer.reject(error);
            }
        }
    }
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const response = event.data;
    const entry = pending.get(response.requestId);
    if (!entry) {
        return;
    }

    pending.delete(response.requestId);

    if (response.status === "success") {
        entry.resolve(response.payload);
    } else {
        entry.reject(new Error(response.error));
    }
    entry.onSettled?.();
}

function handleWorkerError(lane: WorkerLane, event: ErrorEvent): void {
    const message = event.message || "Unknown worker error";
    const error = new Error(message);

    settlePendingForLane(lane, error);
    clearQueuedSimulationForLane(lane, error);

    workers[lane]?.terminate();
    workers[lane] = null;
}

function ensureWorker(lane: WorkerLane): Worker {
    const existing = workers[lane];
    if (existing) {
        return existing;
    }

    const worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (event) => handleWorkerError(lane, event);

    workers[lane] = worker;
    return worker;
}

function advanceSimulationQueue(priority: SimulationRequestPriority): void {
    const state = coalescing[priority];
    state.inFlight = null;

    const next = state.queued;
    if (!next) {
        return;
    }

    state.queued = null;
    state.inFlight = next;
    dispatchCoalescedSimulation(priority, next);
}

function dispatchCoalescedSimulation(
    priority: SimulationRequestPriority,
    job: CoalescedSimulationJob
): void {
    const state = coalescing[priority];
    const worker = ensureWorker(state.lane);

    const request: WorkerRequest<"SIMULATION"> = {
        requestId: job.requestId,
        kind: "SIMULATION",
        payload: job.payload
    };

    pending.set(job.requestId, {
        lane: state.lane,
        resolve: (value: unknown) => {
            for (const consumer of job.consumers) {
                consumer.resolve(value as SimulationResult);
            }
            job.consumers.length = 0;
        },
        reject: (error: Error) => {
            for (const consumer of job.consumers) {
                consumer.reject(error);
            }
            job.consumers.length = 0;
        },
        onSettled: () => {
            if (state.inFlight?.requestId === job.requestId) {
                advanceSimulationQueue(priority);
            }
        }
    });

    try {
        worker.postMessage(request);
    } catch (error) {
        pending.delete(job.requestId);
        const postError = error instanceof Error ? error : new Error(String(error));
        for (const consumer of job.consumers) {
            consumer.reject(postError);
        }
        job.consumers.length = 0;
        if (state.inFlight?.requestId === job.requestId) {
            advanceSimulationQueue(priority);
        }
    }
}

function createSimulationJob(
    priority: SimulationRequestPriority,
    payload: WorkerRequestByKind["SIMULATION"],
    consumer: SimulationConsumer
): CoalescedSimulationJob {
    return {
        requestId: nextRequestId("SIMULATION", coalescing[priority].lane),
        payload,
        consumers: [consumer]
    };
}

function requestSimulationCoalesced(
    payload: WorkerRequestByKind["SIMULATION"]
): Promise<SimulationResult> {
    const priority = priorityFromOptions(payload.options);
    const state = coalescing[priority];

    return new Promise<SimulationResult>((resolve, reject) => {
        const consumer: SimulationConsumer = { resolve, reject };

        if (!state.inFlight) {
            const job = createSimulationJob(priority, payload, consumer);
            state.inFlight = job;
            dispatchCoalescedSimulation(priority, job);
            return;
        }

        if (!state.queued) {
            state.queued = createSimulationJob(priority, payload, consumer);
            return;
        }

        // latest-wins coalescing: keep one queued simulation and fan-out promises.
        state.queued.payload = payload;
        state.queued.consumers.push(consumer);
    });
}

function sendRawWorkerRequest<K extends WorkerRequestKind>(
    lane: WorkerLane,
    kind: K,
    payload: WorkerRequestByKind[K]
): Promise<WorkerResponseByKind[K]> {
    const worker = ensureWorker(lane);
    const requestId = nextRequestId(kind, lane);

    const request: WorkerRequest<K> = {
        requestId,
        kind,
        payload
    };

    return new Promise<WorkerResponseByKind[K]>((resolve, reject) => {
        pending.set(requestId, {
            lane,
            resolve: resolve as (value: unknown) => void,
            reject
        });

        try {
            worker.postMessage(request);
        } catch (error) {
            pending.delete(requestId);
            reject(error instanceof Error ? error : new Error(String(error)));
        }
    });
}

export function sendWorkerRequest<K extends WorkerRequestKind>(
    kind: K,
    payload: WorkerRequest<K>["payload"]
): Promise<WorkerResponseByKind[K]> {
    if (kind === "SIMULATION") {
        const simulationPayload = payload as WorkerRequestByKind["SIMULATION"];
        return requestSimulationCoalesced(simulationPayload) as Promise<WorkerResponseByKind[K]>;
    }

    return sendRawWorkerRequest("compute", kind, payload as WorkerRequestByKind[K]);
}

export function requestSimulation(
    input: SimulationInput,
    options?: SimulationRunOptions
): Promise<SimulationResult> {
    return requestSimulationCoalesced({ input, options });
}

export function requestSimulationBatch(
    inputs: SimulationInput[],
    options?: SimulationRunOptions
): Promise<SimulationResult[]> {
    return sendRawWorkerRequest("compute", "SIMULATION_BATCH", { inputs, options });
}

export function requestSolveContribution(
    input: SimulationInput,
    targetSuccessRate: number
): Promise<number | null> {
    return sendRawWorkerRequest("compute", "SOLVE_CONTRIBUTION", { input, targetSuccessRate });
}

export function requestSolveLaborSavingsRate(
    input: SimulationInput,
    targetSuccessRate: number
): Promise<number | null> {
    return sendRawWorkerRequest("compute", "SOLVE_LABOR_SAVINGS_RATE", { input, targetSuccessRate });
}

export function requestSolveRetireAge(
    input: SimulationInput,
    targetSuccessRate: number
): Promise<number | null> {
    return sendRawWorkerRequest("compute", "SOLVE_RETIRE_AGE", { input, targetSuccessRate });
}

export function requestSensitivityAnalysis(
    input: SimulationInput,
    parameter: "annual_return" | "annual_inflation" | "withdrawal_rate",
    variations: number[]
): Promise<SensitivityResult> {
    return sendRawWorkerRequest("compute", "SENSITIVITY_ANALYSIS", { input, parameter, variations });
}

export function requestPensionOptimization(
    input: SimulationInput
): Promise<PensionOptimizationResult[]> {
    return sendRawWorkerRequest("compute", "PENSION_OPTIMIZATION", { input });
}

export function terminateSimulationWorker(): void {
    const terminationError = new Error("Simulation worker terminated");

    settlePendingForLane("interactive", terminationError);
    settlePendingForLane("compute", terminationError);
    clearQueuedSimulationForLane("interactive", terminationError);
    clearQueuedSimulationForLane("compute", terminationError);

    for (const lane of Object.keys(workers) as WorkerLane[]) {
        workers[lane]?.terminate();
        workers[lane] = null;
    }

    for (const state of Object.values(coalescing)) {
        state.inFlight = null;
        state.queued = null;
    }

    pending.clear();
}
