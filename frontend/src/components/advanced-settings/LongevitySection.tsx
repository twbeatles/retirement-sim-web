import type { LongevityRisk } from "../../logic/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface LongevitySectionProps {
    longevityRisk?: LongevityRisk;
    isOpen: boolean;
    onToggle: () => void;
    onUpdate: (patch: Partial<LongevityRisk>) => void;
}

export function LongevitySection({
    longevityRisk,
    isOpen,
    onToggle,
    onUpdate
}: LongevitySectionProps) {
    return (
        <CollapsibleSection
            title="📆 장수 리스크"
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                    checked={longevityRisk?.useDistribution ?? false}
                    onChange={(e) => onUpdate({ useDistribution: e.target.checked })}
                />
                확률적 기대 수명 적용
            </label>
            {longevityRisk?.useDistribution && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">평균 기대 수명</label>
                        <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <input
                                type="number"
                                className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                value={longevityRisk.averageLifeExpectancy || 83.5}
                                onChange={(e) => onUpdate({ averageLifeExpectancy: Number(e.target.value) })}
                            />
                            <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">세</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">표준편차 (년)</label>
                        <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <input
                                type="number"
                                className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                value={longevityRisk.stdDevYears || 5}
                                onChange={(e) => onUpdate({ stdDevYears: Number(e.target.value) })}
                            />
                            <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">년</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                * 활성화 시 시뮬레이션마다 다른 종료 연령 적용 (몬테카를로 모드). 기본 기대수명 값은 통계청 2023년 생명표의 전체 기대수명 83.5세를 기준으로 설정됩니다.
            </div>
        </CollapsibleSection>
    );
}
