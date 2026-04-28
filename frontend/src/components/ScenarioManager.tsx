import React, { useEffect, useState } from "react";
import type { SimulationInput } from "../logic/types";
import {
    createPlanFileEnvelope,
    legacyInputToPlan,
    parseImportedPlanEnvelope,
    planToLegacyInput,
} from "../logic/plan";
import { validateSimulationInput, validateSimulationPlan } from "../logic/validation";
import {
    scenarioStorage,
    type SavedScenario,
    type StorageResetNotice,
} from "../services/storage";
import { QUICK_PRESETS } from "./scenario-manager/presets";

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

    const loadScenarios = async () => {
        try {
            const list = await scenarioStorage.getAllScenarios();
            setScenarios(list);
            setStorageResetNotice((current) => current ?? scenarioStorage.consumeResetNotice());
            setStorageError(null);
        } catch (error) {
            console.error("Failed to load scenarios", error);
            setScenarios([]);
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
            await scenarioStorage.saveScenario(name.trim(), currentInput);
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

    const importScenario = (file: File) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const importedPlan = parseImportedPlanEnvelope(json);

                if (!importedPlan) {
                    window.alert("v2 또는 v3 플랜 JSON 파일만 가져올 수 있습니다.");
                    return;
                }

                const planWarnings = validateSimulationPlan(importedPlan);
                const planErrors = planWarnings.filter((warning) => warning.severity === "error");
                if (planErrors.length > 0) {
                    window.alert(
                        `가져온 플랜이 유효하지 않습니다:\n${planErrors.map((warning) => warning.message).join("\n")}`
                    );
                    return;
                }

                const importedInput = planToLegacyInput(importedPlan);
                const warnings = validateSimulationInput(importedInput);
                const blockingErrors = warnings.filter((warning) => warning.severity === "error");

                if (blockingErrors.length > 0) {
                    window.alert(
                        `가져온 시나리오에 실행을 막는 오류가 있습니다:\n${blockingErrors.map((warning) => warning.message).join("\n")}`
                    );
                    return;
                }

                const warningMessage =
                    warnings.length > 0
                        ? `경고:\n${warnings.map((warning) => warning.message).join("\n")}\n\n그래도 불러올까요?`
                        : "가져온 플랜을 불러올까요?";

                confirmLoad(importedInput, warningMessage);
            } catch (error) {
                console.error("Failed to import plan JSON", error);
                window.alert("선택한 JSON 파일을 읽지 못했습니다.");
            }
        };

        reader.readAsText(file);
    };

    const exportScenario = () => {
        const payload = createPlanFileEnvelope(legacyInputToPlan(currentInput));
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `retirement_plan_v3_${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mb-4 w-full rounded-2xl border border-slate-100 bg-white p-4 text-slate-900 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-100 lg:p-6">
            <h3 className="mt-0 mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900 dark:border-zinc-800 dark:text-white">
                시나리오 관리자
            </h3>

            {storageResetNotice && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                    <div className="font-semibold">플랜 저장소 업그레이드 안내</div>
                    <div className="mt-1 leading-relaxed">{storageResetNotice.message}</div>
                    <button
                        type="button"
                        className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/20"
                        onClick={() => setStorageResetNotice(null)}
                    >
                        닫기
                    </button>
                </div>
            )}

            {storageError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
                    <div className="font-semibold">시나리오 저장소 사용 불가</div>
                    <div className="mt-1 leading-relaxed">{storageError}</div>
                </div>
            )}

            <div className="mb-4">
                <div className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    빠른 프리셋
                </div>
                <div className="flex flex-wrap gap-2">
                    {QUICK_PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() =>
                                confirmLoad(
                                    preset.apply(currentInput),
                                    `"${preset.name}" 프리셋을 불러올까요?`
                                )
                            }
                            className="cursor-pointer rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 active:scale-95 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>
            </div>

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

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-zinc-700">
                    플랜 JSON 가져오기
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                importScenario(file);
                            }
                            event.target.value = "";
                        }}
                    />
                </label>
                <button
                    onClick={exportScenario}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"
                >
                    현재 플랜 내보내기
                </button>
            </div>

            <div className="flex flex-col gap-2">
                {scenarios.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-100 p-4 text-center text-sm text-slate-400 dark:border-zinc-800 dark:text-slate-500">
                        아직 저장된 시나리오가 없습니다.
                    </div>
                )}

                {scenarios.map((scenario) => (
                    <div
                        key={scenario.id}
                        onClick={() =>
                            confirmLoad(
                                scenario.input,
                                `"${scenario.name}" 시나리오를 불러올까요?`
                            )
                        }
                        className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-blue-50 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:border-blue-900/30 dark:hover:bg-blue-900/10"
                    >
                        <div className="min-w-0 flex-1 pr-2">
                            <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                                {scenario.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                수정일 {new Date(scenario.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button
                            onClick={(event) => remove(scenario.id, event)}
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-500 opacity-0 transition-all hover:border-red-200 hover:bg-red-50 group-hover:opacity-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-red-900/30 dark:hover:bg-red-900/20"
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
});
