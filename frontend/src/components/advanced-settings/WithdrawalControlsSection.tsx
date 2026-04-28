import type { BucketSettings, GuardrailsSettings, RebalancingSettings, SimulationInput } from "../../logic/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface WithdrawalControlsSectionProps {
    withdrawalStrategy: SimulationInput["withdrawal"]["strategy"];
    guardrails?: GuardrailsSettings;
    bucket?: BucketSettings;
    rebalancing?: RebalancingSettings;
    guardrailsOpen: boolean;
    bucketOpen: boolean;
    rebalancingOpen: boolean;
    onToggleGuardrails: () => void;
    onToggleBucket: () => void;
    onToggleRebalancing: () => void;
    onUpdateGuardrails: (patch: Partial<GuardrailsSettings>) => void;
    onUpdateBucket: (patch: Partial<BucketSettings>) => void;
    onUpdateRebalancing: (patch: Partial<RebalancingSettings>) => void;
}

export function WithdrawalControlsSection({
    withdrawalStrategy,
    guardrails,
    bucket,
    rebalancing,
    guardrailsOpen,
    bucketOpen,
    rebalancingOpen,
    onToggleGuardrails,
    onToggleBucket,
    onToggleRebalancing,
    onUpdateGuardrails,
    onUpdateBucket,
    onUpdateRebalancing
}: WithdrawalControlsSectionProps) {
    return (
        <>
            {withdrawalStrategy === "guardrails" && (
                <CollapsibleSection
                    title="🛡️ 가드레일 설정"
                    isOpen={guardrailsOpen}
                    onToggle={onToggleGuardrails}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">기본 인출률</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.005"
                                value={guardrails?.baseRate || 0.04}
                                onChange={(e) => onUpdateGuardrails({ baseRate: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">상한 인출률</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.005"
                                value={guardrails?.upperThreshold || 0.05}
                                onChange={(e) => onUpdateGuardrails({ upperThreshold: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">하한 인출률</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.005"
                                value={guardrails?.lowerThreshold || 0.03}
                                onChange={(e) => onUpdateGuardrails({ lowerThreshold: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">조정 폭</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.05"
                                value={guardrails?.adjustmentRate || 0.1}
                                onChange={(e) => onUpdateGuardrails({ adjustmentRate: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {withdrawalStrategy === "bucket" && (
                <CollapsibleSection
                    title="🪣 버킷 설정"
                    isOpen={bucketOpen}
                    onToggle={onToggleBucket}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">단기 버킷 (년)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                value={bucket?.shortTermYears || 2}
                                onChange={(e) => onUpdateBucket({ shortTermYears: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">중기 버킷 (년)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                value={bucket?.midTermYears || 5}
                                onChange={(e) => onUpdateBucket({ midTermYears: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">단기 수익률 (연)</label>
                            <input
                                type="number"
                                step="0.001"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                value={bucket?.shortTermReturn || 0.02}
                                onChange={(e) => onUpdateBucket({ shortTermReturn: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">중기 수익률 (연)</label>
                            <input
                                type="number"
                                step="0.001"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                value={bucket?.midTermReturn || 0.04}
                                onChange={(e) => onUpdateBucket({ midTermReturn: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">버킷 리밸런싱 주기</label>
                            <select
                                className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                value={bucket?.rebalanceFrequency || "annual"}
                                onChange={(e) => onUpdateBucket({ rebalanceFrequency: e.target.value as BucketSettings["rebalanceFrequency"] })}
                            >
                                <option value="annual">연간</option>
                                <option value="semi-annual">반기</option>
                            </select>
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            <CollapsibleSection
                title="⚖️ 자동 리밸런싱"
                isOpen={rebalancingOpen}
                onToggle={onToggleRebalancing}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={rebalancing?.enabled ?? false}
                        onChange={(e) => onUpdateRebalancing({ enabled: e.target.checked })}
                    />
                    포트폴리오 자동 리밸런싱
                </label>
                {rebalancing?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">리밸런싱 주기</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg py-2 pl-3 pr-10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                    value={rebalancing.frequency || "annual"}
                                    onChange={(e) => onUpdateRebalancing({ frequency: e.target.value as RebalancingSettings["frequency"] })}
                                >
                                    <option value="monthly">매월</option>
                                    <option value="quarterly">분기별</option>
                                    <option value="semi-annual">반기별</option>
                                    <option value="annual">연간</option>
                                    <option value="threshold">임계값 초과시</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        {rebalancing.frequency === "threshold" && (
                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">임계값 (%)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    step="1"
                                    value={(rebalancing.thresholdPercent || 0.05) * 100}
                                    onChange={(e) => onUpdateRebalancing({ thresholdPercent: Number(e.target.value) / 100 })}
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-2">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">거래 비용 (%)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    step="0.01"
                                    value={(rebalancing.tradingCostPercent || 0.001) * 100}
                                    onChange={(e) => onUpdateRebalancing({ tradingCostPercent: Number(e.target.value) / 100 })}
                                />
                            </div>
                            <div className="flex items-center sm:mt-6">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                        checked={rebalancing.taxEfficient ?? false}
                                        onChange={(e) => onUpdateRebalancing({ taxEfficient: e.target.checked })}
                                    />
                                    세금 효율적
                                </label>
                            </div>
                        </div>
                    </div>
                )}
                <div className="text-xs text-sub mt-2">
                    * 리밸런싱 시 설정된 거래 비용이 자산에서 차감됩니다
                </div>
            </CollapsibleSection>
        </>
    );
}
