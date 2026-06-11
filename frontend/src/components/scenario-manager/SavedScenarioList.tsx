import type React from "react";
import type { SimulationInput } from "../../logic/types";
import type { SavedScenario } from "../../services/storage";

type SavedScenarioListProps = {
    scenarios: SavedScenario[];
    onConfirmLoad: (input: SimulationInput, message?: string) => void;
    onRemove: (id: number | undefined, event: React.MouseEvent) => void;
};

export function SavedScenarioList({ scenarios, onConfirmLoad, onRemove }: SavedScenarioListProps) {
    if (scenarios.length === 0) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-100 p-4 text-center text-sm text-slate-400 dark:border-zinc-800 dark:text-slate-500">
                아직 저장된 시나리오가 없습니다.
            </div>
        );
    }

    return (
        <>
            {scenarios.map((scenario) => (
                <div
                    key={scenario.id}
                    onClick={() =>
                        onConfirmLoad(
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
                        onClick={(event) => onRemove(scenario.id, event)}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-500 opacity-0 transition-all hover:border-red-200 hover:bg-red-50 group-hover:opacity-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-red-900/30 dark:hover:bg-red-900/20"
                    >
                        삭제
                    </button>
                </div>
            ))}
        </>
    );
}
