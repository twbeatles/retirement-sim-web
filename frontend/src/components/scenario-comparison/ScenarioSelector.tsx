import type { SavedScenario } from "../../services/storage";

type ScenarioSelectorProps = {
    scenarios: SavedScenario[];
    selectedIds: number[];
    isComparing: boolean;
    onToggleScenario: (id: number) => void;
    onRunComparison: () => void;
};

export function ScenarioSelector({
    scenarios,
    selectedIds,
    isComparing,
    onToggleScenario,
    onRunComparison,
}: ScenarioSelectorProps) {
    if (scenarios.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                <span className="text-3xl mb-3 opacity-40">📁</span>
                <p className="font-medium text-slate-500 dark:text-slate-400 text-sm m-0">저장된 시나리오가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex flex-col gap-3 mb-6 p-4 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50/50 dark:bg-zinc-800/30">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>📌</span> 시나리오 선택 (최대 5개)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scenarios.map((scenario) => (
                        <label key={scenario.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors group/cb">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                checked={selectedIds.includes(scenario.id)}
                                onChange={() => onToggleScenario(scenario.id)}
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover/cb:text-slate-900 dark:group-hover/cb:text-white truncate">
                                    {scenario.name}
                                </span>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    ({new Date(scenario.updatedAt).toLocaleDateString()})
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <button
                onClick={onRunComparison}
                disabled={isComparing || selectedIds.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-700 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm disabled:cursor-not-allowed cursor-pointer mb-6"
            >
                {isComparing ? (
                    <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        비교 중...
                    </div>
                ) : "비교 실행"}
            </button>
        </div>
    );
}
