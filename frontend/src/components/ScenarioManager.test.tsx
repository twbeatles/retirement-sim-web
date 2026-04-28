import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INPUT } from "../logic/constants";
import { ScenarioManager } from "./ScenarioManager";

const storageMocks = vi.hoisted(() => ({
    getAllScenarios: vi.fn(),
    saveScenario: vi.fn(),
    deleteScenario: vi.fn(),
    consumeResetNotice: vi.fn(),
}));

vi.mock("../services/storage", () => ({
    scenarioStorage: storageMocks,
}));

describe("ScenarioManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
    });

    it("shows JSON fallback guidance when IndexedDB scenario loading fails", async () => {
        storageMocks.getAllScenarios.mockRejectedValueOnce(new Error("IndexedDB blocked"));

        render(
            <ScenarioManager
                currentInput={structuredClone(INITIAL_INPUT)}
                onLoad={vi.fn()}
            />
        );

        expect(await screen.findByText("시나리오 저장소 사용 불가")).toBeInTheDocument();
        expect(screen.getByText(/JSON으로 내보내고/)).toBeInTheDocument();
    });
});
