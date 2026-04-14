import type { ReverseAnnuity, SeveranceSettings } from "../../logic/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface RetirementIncomeSectionProps {
    severance?: SeveranceSettings;
    reverseAnnuity?: ReverseAnnuity;
    severanceOpen: boolean;
    reverseOpen: boolean;
    onToggleSeverance: () => void;
    onToggleReverse: () => void;
    onUpdateSeverance: (patch: Partial<SeveranceSettings>) => void;
    onUpdateReverseAnnuity: (patch: Partial<ReverseAnnuity>) => void;
}

export function RetirementIncomeSection({
    severance,
    reverseAnnuity,
    severanceOpen,
    reverseOpen,
    onToggleSeverance,
    onToggleReverse,
    onUpdateSeverance,
    onUpdateReverseAnnuity
}: RetirementIncomeSectionProps) {
    return (
        <>
            <CollapsibleSection
                title="💼 퇴직금"
                isOpen={severanceOpen}
                onToggle={onToggleSeverance}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={severance?.enabled ?? false}
                        onChange={(e) => onUpdateSeverance({ enabled: e.target.checked })}
                    />
                    퇴직금 시뮬레이션
                </label>
                {severance?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">예상 퇴직금</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={severance.estimatedAmount || 0}
                                    onChange={(e) => onUpdateSeverance({ estimatedAmount: Number(e.target.value) })}
                                />
                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">원</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="severance_type"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={severance.payoutType === "lump_sum"}
                                    onChange={() => onUpdateSeverance({ payoutType: "lump_sum" })}
                                />
                                일시금 수령
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="severance_type"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={severance.payoutType === "annuity"}
                                    onChange={() => onUpdateSeverance({ payoutType: "annuity" })}
                                />
                                연금화
                            </label>
                        </div>
                        {severance.payoutType === "annuity" && (
                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연금 수령 기간 (년)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={severance.annuityYears || 10}
                                    onChange={(e) => onUpdateSeverance({ annuityYears: Number(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            <CollapsibleSection
                title="🏠 주택연금"
                isOpen={reverseOpen}
                onToggle={onToggleReverse}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={reverseAnnuity?.enabled ?? false}
                        onChange={(e) => onUpdateReverseAnnuity({ enabled: e.target.checked })}
                    />
                    주택연금 활용
                </label>
                {reverseAnnuity?.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">주택 시가</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={reverseAnnuity.houseValue || 0}
                                    onChange={(e) => onUpdateReverseAnnuity({ houseValue: Number(e.target.value) })}
                                />
                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">원</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">수령 시작 나이</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={reverseAnnuity.startAge || 65}
                                    onChange={(e) => onUpdateReverseAnnuity({ startAge: Number(e.target.value) })}
                                />
                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">세</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">예상 월 수령액</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={reverseAnnuity.monthlyPayment || 0}
                                    onChange={(e) => onUpdateReverseAnnuity({ monthlyPayment: Number(e.target.value) })}
                                />
                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">원</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                    * <a href="https://www.hf.go.kr" target="_blank" rel="noopener" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors">HF 주택연금</a>에서 예상 수령액 계산 가능
                </div>
            </CollapsibleSection>
        </>
    );
}
