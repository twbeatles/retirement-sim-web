import type { SimulationInput } from "../../logic/types";
import { QUICK_PRESETS } from "./presets";

type QuickPresetListProps = {
    currentInput: SimulationInput;
    onConfirmLoad: (input: SimulationInput, message?: string) => void;
};

export function QuickPresetList({ currentInput, onConfirmLoad }: QuickPresetListProps) {
    return (
        <div className="mb-4">
            <div className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                빠른 프리셋
            </div>
            <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((preset) => (
                    <button
                        key={preset.name}
                        onClick={() =>
                            onConfirmLoad(
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
    );
}
