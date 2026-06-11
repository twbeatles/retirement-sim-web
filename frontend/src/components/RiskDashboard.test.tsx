import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INPUT } from "../logic/constants";
import { RiskDashboard } from "./RiskDashboard";

const simulationClientMocks = vi.hoisted(() => ({
    requestSensitivityAnalysis: vi.fn(),
}));

vi.mock("../logic/simulationClient", () => simulationClientMocks);

describe("RiskDashboard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
    });

    it("shows a user-facing message when sensitivity analysis fails", async () => {
        simulationClientMocks.requestSensitivityAnalysis.mockRejectedValue(new Error("worker failed"));

        render(
            <RiskDashboard
                input={structuredClone(INITIAL_INPUT)}
                result={null}
                onInputChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("민감도 분석"));
        fireEvent.click(screen.getByText("민감도 분석 실행"));

        await waitFor(() => {
            expect(screen.getByText(/민감도 분석을 완료하지 못했습니다/)).toBeInTheDocument();
        });
    });
});
