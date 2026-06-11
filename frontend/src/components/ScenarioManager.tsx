import React, { useEffect, useState } from "react";
import type { SimulationInput } from "../logic/types";
import {
    scenarioStorage,
    type SavedScenario,
    type StorageResetNotice,
} from "../services/storage";
import { importScenarioFile, exportScenarioFile } from "./scenario-manager/fileExchange";
import { QuickPresetList } from "./scenario-manager/QuickPresetList";
import { SavedScenarioList } from "./scenario-manager/SavedScenarioList";
import { ScenarioFileControls } from "./scenario-manager/ScenarioFileControls";
import { StorageMessages } from "./scenario-manager/StorageMessages";

interface Props {
    currentInput: SimulationInput;
    onLoad: (input: SimulationInput) => void;
}

export const ScenarioManager = React.memo(function ScenarioManager({
    currentInput,
    onLoad,
}: Props) {
    const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
    const [name, setName] = useState("");
    const [storageResetNotice, setStorageResetNotice] =
        useState<StorageResetNotice | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [corruptRecordCount, setCorruptRecordCount] = useState(0);

    const loadScenarios = async () => {
        try {
            const list = await scenarioStorage.getAllScenarios();
            setScenarios(list);
            setCorruptRecordCount(scenarioStorage.getLastCorruptRecordCount());
            setStorageResetNotice((current) => current ?? scenarioStorage.consumeResetNotice());
            setStorageError(null);
        } catch (error) {
            console.error("Failed to load scenarios", error);
            setScenarios([]);
            setCorruptRecordCount(0);
            setStorageError(
                "로컬 시나리오 저장소를 사용할 수 없습니다. 현재 플랜을 JSON으로 내보내고 나중에 JSON 백업을 다시 가져올 수 있습니다."
            );
        }
    };

    useEffect(() => {
        void loadScenarios();
    }, []);

    const confirmLoad = (data: SimulationInput, message?: string) => {
        if (window.confirm(message ?? "이 시나리오를 불러와 현재 입력값을 바꿀까요?")) {
            onLoad(data);
        }
    };

    const save = async () => {
        if (!name.trim()) {
            window.alert("시나리오 이름을 먼저 입력하세요.");
            return;
        }

        try {
            const scenarioName = name.trim();
            const existing = scenarios.find((scenario) => scenario.name === scenarioName);
            if (existing) {
                if (!window.confirm(`"${scenarioName}" 시나리오가 이미 있습니다. 기존 저장본을 덮어쓸까요?`)) {
                    return;
                }
                await scenarioStorage.updateScenario(existing.id, scenarioName, currentInput);
            } else {
                await scenarioStorage.saveScenario(scenarioName, currentInput);
            }
            await loadScenarios();
            setName("");
        } catch (error) {
            setStorageError(
                "로컬 시나리오 저장소를 사용할 수 없습니다. 현재 플랜 내보내기로 JSON 백업을 만들어 주세요."
            );
            window.alert("시나리오 저장에 실패했습니다.");
            console.error(error);
        }
    };

    const remove = async (id: number | undefined, event: React.MouseEvent) => {
        event.stopPropagation();
        if (id === undefined) {
            return;
        }

        if (!window.confirm("저장된 시나리오를 삭제할까요?")) {
            return;
        }

        try {
            await scenarioStorage.deleteScenario(id);
            await loadScenarios();
        } catch (error) {
            setStorageError(
                "로컬 시나리오 저장소를 사용할 수 없습니다. 브라우저 저장소가 차단된 동안에는 JSON 가져오기/내보내기를 사용하세요."
            );
            console.error("Failed to delete scenario", error);
        }
    };

    return (
        <div className="mb-4 w-full rounded-2xl border border-slate-100 bg-white p-4 text-slate-900 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-100 lg:p-6">
            <h3 className="mt-0 mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900 dark:border-zinc-800 dark:text-white">
                시나리오 관리자
            </h3>

            <StorageMessages
                resetNotice={storageResetNotice}
                storageError={storageError}
                corruptRecordCount={corruptRecordCount}
                onDismissResetNotice={() => setStorageResetNotice(null)}
            />

            <QuickPresetList currentInput={currentInput} onConfirmLoad={confirmLoad} />

            <div className="my-4 h-px bg-slate-100 dark:bg-zinc-800" />

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                    placeholder="시나리오 이름"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
                <button
                    onClick={save}
                    className="cursor-pointer whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                >
                    현재 입력값 저장
                </button>
            </div>

            <ScenarioFileControls
                onImport={(file) => importScenarioFile(file, confirmLoad)}
                onExport={() => exportScenarioFile(currentInput)}
            />

            <div className="flex flex-col gap-2">
                <SavedScenarioList
                    scenarios={scenarios}
                    onConfirmLoad={confirmLoad}
                    onRemove={remove}
                />
            </div>
        </div>
    );
});
