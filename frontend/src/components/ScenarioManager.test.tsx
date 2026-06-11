import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INPUT } from "../logic/constants";
import { legacyInputToPlan } from "../logic/plan";
import { MAX_PLAN_IMPORT_BYTES } from "../logic/runtimeLimits";
import { ScenarioManager } from "./ScenarioManager";

const storageMocks = vi.hoisted(() => ({
    getAllScenarios: vi.fn(),
    saveScenario: vi.fn(),
    updateScenario: vi.fn(),
    deleteScenario: vi.fn(),
    consumeResetNotice: vi.fn(),
    getLastCorruptRecordCount: vi.fn(),
}));

vi.mock("../services/storage", () => ({
    scenarioStorage: storageMocks,
}));

describe("ScenarioManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        storageMocks.getAllScenarios.mockResolvedValue([]);
        storageMocks.saveScenario.mockResolvedValue(1);
        storageMocks.updateScenario.mockResolvedValue(undefined);
        storageMocks.deleteScenario.mockResolvedValue(undefined);
        storageMocks.consumeResetNotice.mockReturnValue(null);
        storageMocks.getLastCorruptRecordCount.mockReturnValue(0);
        vi.spyOn(window, "alert").mockImplementation(() => undefined);
        vi.spyOn(window, "confirm").mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
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

    it("rejects oversized JSON imports before reading the file", async () => {
        const { container } = render(
            <ScenarioManager
                currentInput={structuredClone(INITIAL_INPUT)}
                onLoad={vi.fn()}
            />
        );
        await screen.findByText("아직 저장된 시나리오가 없습니다.");

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const oversized = new File([new Uint8Array(MAX_PLAN_IMPORT_BYTES + 1)], "large.json", {
            type: "application/json"
        });
        fireEvent.change(input, { target: { files: [oversized] } });

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("1MB 이하"));
    });

    it("shows a read error when FileReader fails", async () => {
        class FailingFileReader {
            onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
            onerror: (() => void) | null = null;
            onabort: (() => void) | null = null;
            readAsText(): void {
                void this.onload;
                void this.onabort;
                this.onerror?.();
            }
        }
        vi.stubGlobal("FileReader", FailingFileReader);
        const { container } = render(
            <ScenarioManager
                currentInput={structuredClone(INITIAL_INPUT)}
                onLoad={vi.fn()}
            />
        );
        await screen.findByText("아직 저장된 시나리오가 없습니다.");

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, {
            target: { files: [new File(["{}"], "plan.json", { type: "application/json" })] }
        });

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("읽는 중 오류"));
    });

    it("alerts when an imported JSON file is not a plan envelope", async () => {
        const { container } = render(
            <ScenarioManager
                currentInput={structuredClone(INITIAL_INPUT)}
                onLoad={vi.fn()}
            />
        );
        await screen.findByText("아직 저장된 시나리오가 없습니다.");

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, {
            target: { files: [new File([JSON.stringify({ nope: true })], "plan.json", { type: "application/json" })] }
        });

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("v2 또는 v3 플랜 JSON 구조"));
        });
    });

    it("updates an existing scenario when saving with a duplicate name", async () => {
        const plan = legacyInputToPlan(structuredClone(INITIAL_INPUT));
        storageMocks.getAllScenarios.mockResolvedValue([
            {
                id: 7,
                name: "same-name",
                createdAt: 1,
                updatedAt: 2,
                schemaVersion: 3,
                plan,
                input: structuredClone(INITIAL_INPUT)
            }
        ]);

        render(
            <ScenarioManager
                currentInput={structuredClone(INITIAL_INPUT)}
                onLoad={vi.fn()}
            />
        );
        await screen.findByText("same-name");

        fireEvent.change(screen.getByPlaceholderText("시나리오 이름"), {
            target: { value: "same-name" }
        });
        fireEvent.click(screen.getByText("현재 입력값 저장"));

        await waitFor(() => {
            expect(storageMocks.updateScenario).toHaveBeenCalledWith(7, "same-name", expect.any(Object));
        });
        expect(storageMocks.saveScenario).not.toHaveBeenCalled();
    });

    it("shows corrupt local record guidance when storage skips records", async () => {
        storageMocks.getLastCorruptRecordCount.mockReturnValue(2);

        render(
            <ScenarioManager
                currentInput={structuredClone(INITIAL_INPUT)}
                onLoad={vi.fn()}
            />
        );

        expect(await screen.findByText("손상된 저장 시나리오 제외")).toBeInTheDocument();
        expect(screen.getByText(/2개를 건너뛰었습니다/)).toBeInTheDocument();
    });
});
