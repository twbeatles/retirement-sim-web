import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioComparison } from "./ScenarioComparison";

const storageMocks = vi.hoisted(() => ({
    getAllScenarios: vi.fn(),
}));

vi.mock("../services/storage", () => ({
    scenarioStorage: storageMocks,
}));

describe("ScenarioComparison", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
    });

    it("shows a user-facing message when saved scenarios fail to load", async () => {
        storageMocks.getAllScenarios.mockRejectedValue(new Error("blocked"));

        render(<ScenarioComparison currentResult={null} />);

        expect(await screen.findByText(/저장된 시나리오를 불러오지 못했습니다/)).toBeInTheDocument();
    });
});
