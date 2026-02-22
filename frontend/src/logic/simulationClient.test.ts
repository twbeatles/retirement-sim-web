import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimulationInput, SimulationResult } from "./types";

type PostedRequest = {
    requestId: string;
    kind: string;
    payload: unknown;
};

class MockWorker {
    static instances: MockWorker[] = [];

    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    readonly posted: PostedRequest[] = [];
    terminated = false;

    constructor(_url: URL, _options?: WorkerOptions) {
        MockWorker.instances.push(this);
    }

    postMessage(message: PostedRequest): void {
        this.posted.push(message);
    }

    terminate(): void {
        this.terminated = true;
    }

    respondSuccess(index: number, payload: unknown): void {
        const request = this.posted[index];
        this.onmessage?.({
            data: {
                requestId: request.requestId,
                kind: request.kind,
                status: "success",
                payload
            }
        } as MessageEvent);
    }
}

function createInput(seed: number): SimulationInput {
    return {
        current_age: 60,
        retire_age: 65,
        end_age: 85,
        annual_inflation: 0.02,
        portfolio: {
            assetClasses: [
                {
                    id: "stock",
                    name: "Stock",
                    allocation: 1,
                    expectedAnnualReturn: 0.06,
                    annualVolatility: 0.18
                }
            ],
            manualCorrelation: 1
        },
        general: {
            current_balance: 1000000,
            monthly_contribution: 0
        },
        private_pension: {
            current_balance: 0,
            monthly_contribution: 0,
            annual_return: 0,
            payout_years: 0,
            annuity_annual_rate: 0
        },
        national_pension: {
            expected_monthly_benefit_at_retirement: 0,
            inflation_linked: false
        },
        debt: {
            current_balance: 0,
            annual_interest: 0,
            monthly_payment: 0
        },
        withdrawal: {
            strategy: "fixed_amount",
            fixedMonthlyAmount: 0,
            taxRate: 0,
            taxStrategy: "simple"
        },
        events: [],
        simulation_settings: {
            mode: "montecarlo",
            mc_paths: 32,
            seed
        }
    };
}

function createResult(detailLevel: "preview" | "full", successRate: number): SimulationResult {
    return {
        mode: "deterministic",
        detailLevel,
        timeline: [],
        summary: {
            retireAge: 65,
            endAge: 85,
            finalTotalAssets: 1000000,
            finalTotalAssetsReal: 1000000,
            successRate
        }
    };
}

beforeEach(() => {
    vi.resetModules();
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);
});

afterEach(async () => {
    const client = await import("./simulationClient");
    client.terminateSimulationWorker();
    vi.unstubAllGlobals();
});

describe("simulationClient queueing", () => {
    it("routes preview to interactive lane and full/batch to compute lane", async () => {
        const client = await import("./simulationClient");

        const previewPromise = client.requestSimulation(createInput(1), { detailLevel: "preview" });
        expect(MockWorker.instances).toHaveLength(1);
        const interactiveWorker = MockWorker.instances[0];
        expect(interactiveWorker.posted).toHaveLength(1);
        expect(interactiveWorker.posted[0].kind).toBe("SIMULATION");
        expect((interactiveWorker.posted[0].payload as { options?: { detailLevel?: string } }).options?.detailLevel).toBe("preview");

        const fullPromise = client.requestSimulation(createInput(2), { detailLevel: "full" });
        const batchPromise = client.requestSimulationBatch([createInput(3)], { detailLevel: "full" });
        expect(MockWorker.instances).toHaveLength(2);
        const computeWorker = MockWorker.instances[1];
        expect(computeWorker.posted).toHaveLength(2);
        expect(computeWorker.posted.map((request) => request.kind)).toEqual(["SIMULATION", "SIMULATION_BATCH"]);

        interactiveWorker.respondSuccess(0, createResult("preview", 0.2));
        computeWorker.respondSuccess(0, createResult("full", 0.8));
        computeWorker.respondSuccess(1, [createResult("full", 0.7)]);

        const [previewResult, fullResult, batchResult] = await Promise.all([
            previewPromise,
            fullPromise,
            batchPromise
        ]);

        expect(previewResult.detailLevel).toBe("preview");
        expect(fullResult.detailLevel).toBe("full");
        expect(batchResult).toHaveLength(1);
    });

    it("applies latest-wins queue coalescing and promise fan-out for preview requests", async () => {
        const client = await import("./simulationClient");

        const first = client.requestSimulation(createInput(101), { detailLevel: "preview" });
        const second = client.requestSimulation(createInput(202), { detailLevel: "preview" });
        const third = client.requestSimulation(createInput(303), { detailLevel: "preview" });

        expect(MockWorker.instances).toHaveLength(1);
        const interactiveWorker = MockWorker.instances[0];
        expect(interactiveWorker.posted).toHaveLength(1);

        interactiveWorker.respondSuccess(0, createResult("preview", 0.1));

        expect(interactiveWorker.posted).toHaveLength(2);
        const latestQueuedPayload = interactiveWorker.posted[1].payload as {
            input: SimulationInput;
        };
        expect(latestQueuedPayload.input.simulation_settings.seed).toBe(303);

        const latestResult = createResult("preview", 0.9);
        interactiveWorker.respondSuccess(1, latestResult);

        const [firstResult, secondResult, thirdResult] = await Promise.all([first, second, third]);

        expect(firstResult.summary.successRate).toBeCloseTo(0.1, 8);
        expect(secondResult).toBe(latestResult);
        expect(thirdResult).toBe(latestResult);
    });

    it("terminates both lanes and rejects pending/queued requests", async () => {
        const client = await import("./simulationClient");

        const previewInFlight = client.requestSimulation(createInput(11), { detailLevel: "preview" });
        const previewQueued = client.requestSimulation(createInput(12), { detailLevel: "preview" });
        const fullInFlight = client.requestSimulation(createInput(13), { detailLevel: "full" });

        expect(MockWorker.instances).toHaveLength(2);
        const [interactiveWorker, computeWorker] = MockWorker.instances;

        client.terminateSimulationWorker();

        await expect(previewInFlight).rejects.toThrow("Simulation worker terminated");
        await expect(previewQueued).rejects.toThrow("Simulation worker terminated");
        await expect(fullInFlight).rejects.toThrow("Simulation worker terminated");

        expect(interactiveWorker.terminated).toBe(true);
        expect(computeWorker.terminated).toBe(true);
    });
});
