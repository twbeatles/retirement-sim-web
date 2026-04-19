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

interface Props {
    currentInput: SimulationInput;
    onLoad: (input: SimulationInput) => void;
}

const QUICK_PRESETS = [
    {
        name: "FIRE 40",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 30,
            retire_age: 40,
            end_age: 95,
            general: { ...base.general, monthly_contribution: 3000000 },
            withdrawal: {
                ...base.withdrawal,
                strategy: "safe_withdrawal_rate",
                initialSafeRate: 0.035,
            },
        }),
    },
    {
        name: "Standard 60",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 35,
            retire_age: 60,
            end_age: 90,
            general: { ...base.general, monthly_contribution: 1000000 },
            national_pension: {
                ...base.national_pension,
                startAge: 65,
                expected_monthly_benefit_at_retirement: 1500000,
            },
        }),
    },
    {
        name: "High assets 50",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 30,
            retire_age: 50,
            general: {
                ...base.general,
                current_balance: 500000000,
                monthly_contribution: 500000,
            },
        }),
    },
];

export const ScenarioManager = React.memo(function ScenarioManager({
    currentInput,
    onLoad,
}: Props) {
    const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
    const [name, setName] = useState("");
    const [storageResetNotice, setStorageResetNotice] =
        useState<StorageResetNotice | null>(null);

    const loadScenarios = async () => {
        try {
            const list = await scenarioStorage.getAllScenarios();
            setScenarios(list);
            setStorageResetNotice((current) => current ?? scenarioStorage.consumeResetNotice());
        } catch (error) {
            console.error("Failed to load scenarios", error);
        }
    };

    useEffect(() => {
        void loadScenarios();
    }, []);

    const confirmLoad = (data: SimulationInput, message?: string) => {
        if (window.confirm(message ?? "Load this scenario and replace the current inputs?")) {
            onLoad(data);
        }
    };

    const save = async () => {
        if (!name.trim()) {
            window.alert("Enter a scenario name first.");
            return;
        }

        try {
            await scenarioStorage.saveScenario(name.trim(), currentInput);
            await loadScenarios();
            setName("");
        } catch (error) {
            window.alert("Failed to save the scenario.");
            console.error(error);
        }
    };

    const remove = async (id: number | undefined, event: React.MouseEvent) => {
        event.stopPropagation();
        if (id === undefined) {
            return;
        }

        if (!window.confirm("Delete this saved scenario?")) {
            return;
        }

        try {
            await scenarioStorage.deleteScenario(id);
            await loadScenarios();
        } catch (error) {
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
                    window.alert("Only v2 or v3 plan JSON files can be imported.");
                    return;
                }

                const planWarnings = validateSimulationPlan(importedPlan);
                const planErrors = planWarnings.filter((warning) => warning.severity === "error");
                if (planErrors.length > 0) {
                    window.alert(
                        `Imported plan is invalid:\n${planErrors.map((warning) => warning.message).join("\n")}`
                    );
                    return;
                }

                const importedInput = planToLegacyInput(importedPlan);
                const warnings = validateSimulationInput(importedInput);
                const blockingErrors = warnings.filter((warning) => warning.severity === "error");

                if (blockingErrors.length > 0) {
                    window.alert(
                        `Imported scenario has blocking errors:\n${blockingErrors.map((warning) => warning.message).join("\n")}`
                    );
                    return;
                }

                const warningMessage =
                    warnings.length > 0
                        ? `Warnings:\n${warnings.map((warning) => warning.message).join("\n")}\n\nLoad anyway?`
                        : "Load the imported plan?";

                confirmLoad(importedInput, warningMessage);
            } catch (error) {
                console.error("Failed to import plan JSON", error);
                window.alert("Failed to read the selected JSON file.");
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
                Scenario Manager
            </h3>

            {storageResetNotice && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                    <div className="font-semibold">SimulationPlanV3 storage upgrade notice</div>
                    <div className="mt-1 leading-relaxed">{storageResetNotice.message}</div>
                    <button
                        type="button"
                        className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/20"
                        onClick={() => setStorageResetNotice(null)}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <div className="mb-4">
                <div className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Quick presets
                </div>
                <div className="flex flex-wrap gap-2">
                    {QUICK_PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() =>
                                confirmLoad(
                                    preset.apply(currentInput),
                                    `Load the "${preset.name}" preset?`
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
                    placeholder="Scenario name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
                <button
                    onClick={save}
                    className="cursor-pointer whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                >
                    Save current inputs
                </button>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-zinc-700">
                    Import plan JSON
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
                    Export current plan
                </button>
            </div>

            <div className="flex flex-col gap-2">
                {scenarios.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-100 p-4 text-center text-sm text-slate-400 dark:border-zinc-800 dark:text-slate-500">
                        No saved scenarios yet.
                    </div>
                )}

                {scenarios.map((scenario) => (
                    <div
                        key={scenario.id}
                        onClick={() =>
                            confirmLoad(
                                scenario.input,
                                `Load the "${scenario.name}" scenario?`
                            )
                        }
                        className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-blue-50 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:border-blue-900/30 dark:hover:bg-blue-900/10"
                    >
                        <div className="min-w-0 flex-1 pr-2">
                            <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                                {scenario.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Updated {new Date(scenario.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button
                            onClick={(event) => remove(scenario.id, event)}
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-500 opacity-0 transition-all hover:border-red-200 hover:bg-red-50 group-hover:opacity-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-red-900/30 dark:hover:bg-red-900/20"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
});
