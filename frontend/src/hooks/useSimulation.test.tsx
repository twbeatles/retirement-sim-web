import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INPUT } from "../logic/constants";
import { runSimulation as runEngineSimulation } from "../logic/engine";
import type { SimulationResult } from "../logic/types";
import { useSimulation } from "./useSimulation";

const simulationClientMocks = vi.hoisted(() => ({
    requestSimulation: vi.fn(),
    requestSolveContribution: vi.fn(),
    requestSolveLaborSavingsRate: vi.fn(),
    requestSolveRetireAge: vi.fn(),
    requestSensitivityAnalysis: vi.fn(),
}));

vi.mock("../logic/simulationClient", () => simulationClientMocks);

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    return { promise, resolve, reject };
}

function createResult(): SimulationResult {
    const input = structuredClone(INITIAL_INPUT);
    input.current_age = 65;
    input.retire_age = 65;
    input.end_age = 66;
    input.simulation_settings.mode = "deterministic";
    return runEngineSimulation(input);
}

describe("useSimulation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not publish a stale simulation result after clearResult invalidates it", async () => {
        const deferred = createDeferred<SimulationResult>();
        const fakeResult = createResult();
        simulationClientMocks.requestSimulation.mockReturnValueOnce(deferred.promise);

        const { result } = renderHook(() => useSimulation());
        let runPromise!: Promise<SimulationResult>;

        act(() => {
            runPromise = result.current.runSimulation(structuredClone(INITIAL_INPUT));
        });

        await waitFor(() => {
            expect(simulationClientMocks.requestSimulation).toHaveBeenCalledTimes(1);
        });

        act(() => {
            result.current.clearResult();
        });

        await act(async () => {
            deferred.resolve(fakeResult);
            await runPromise;
        });

        expect(result.current.result).toBeNull();
        expect(result.current.isCalculating).toBe(false);
        expect(result.current.error).toBeNull();
    });
});
