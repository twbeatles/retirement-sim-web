import type { InflationScenario } from "../../logic/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface InflationSectionProps {
    annualInflation: number;
    scenario?: InflationScenario;
    isOpen: boolean;
    onToggle: () => void;
    onUpdate: (scenario: Partial<InflationScenario>) => void;
}

const INFLATION_PRESETS: { type: InflationScenario["type"]; label: string; rate: number }[] = [
    { type: "low", label: "저인플레 (1.5%)", rate: 0.015 },
    { type: "normal", label: "정상 (2.0%)", rate: 0.02 },
    { type: "high", label: "고인플레 (3.5%)", rate: 0.035 },
    { type: "custom", label: "커스텀", rate: 0.02 },
    { type: "spike", label: "스파이크 시나리오", rate: 0.02 }
];

export function InflationSection({
    annualInflation,
    scenario,
    isOpen,
    onToggle,
    onUpdate
}: InflationSectionProps) {
    return (
        <CollapsibleSection
            title="📈 인플레이션 시나리오"
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="flex flex-wrap mb-4 gap-2">
                {INFLATION_PRESETS.map((preset) => (
                    <button
                        key={preset.type}
                        onClick={() => onUpdate({ type: preset.type, baseRate: preset.rate })}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${scenario?.type === preset.type ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700"}`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {scenario?.type === "spike" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">스파이크 시작 연령</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={scenario.spikeStartAge || 65}
                            onChange={(e) => onUpdate({ spikeStartAge: Number(e.target.value) })}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">스파이크 기간 (년)</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={scenario.spikeDurationYears || 3}
                            onChange={(e) => onUpdate({ spikeDurationYears: Number(e.target.value) })}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">스파이크 인플레율</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            step="0.01"
                            value={scenario.spikeRate || 0.06}
                            onChange={(e) => onUpdate({ spikeRate: Number(e.target.value) })}
                        />
                    </div>
                </div>
            )}

            {scenario?.type === "custom" && (
                <div className="mt-4 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">커스텀 연간 인플레이션율</label>
                    <input
                        type="number"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        step="0.001"
                        value={scenario.baseRate ?? annualInflation}
                        onChange={(e) => onUpdate({ baseRate: Number(e.target.value) })}
                    />
                </div>
            )}
        </CollapsibleSection>
    );
}
