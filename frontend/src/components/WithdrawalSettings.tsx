import React from "react";
import { WithdrawalPolicy, WithdrawalStrategy } from "../logic/types";

interface Props {
    withdrawal: WithdrawalPolicy;
    onChange: (w: WithdrawalPolicy) => void;
}

const STRATEGIES: { id: WithdrawalStrategy; label: string; desc: string }[] = [
    { id: "target_spending", label: "목표 생활비 충당 (Gap Filler)", desc: "국민/개인연금으로 부족한 금액만큼만 인출합니다." },
    { id: "fixed_amount", label: "고정 금액 인출", desc: "매월 정해진 금액을 무조건 인출합니다." },
    { id: "fixed_percentage", label: "자산 비율 인출 (정율)", desc: "현재 잔액의 N%를 매년(월할) 인출합니다." },
    { id: "safe_withdrawal_rate", label: "4% 룰 (Safe Withdrawal Rate)", desc: "초기 자산의 N%를 인출하되, 물가 상승분을 반영하여 구매력을 유지합니다." },
    { id: "vpw", label: "가변 인출 (VPW)", desc: "기대 수명을 고려하여, 자산이 고갈되지 않으면서 수익률에 따라 인출액을 조절합니다." },
];

export function WithdrawalSettings({ withdrawal, onChange }: Props) {

    const updateField = (field: keyof WithdrawalPolicy, value: any) => {
        onChange({ ...withdrawal, [field]: value });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all mt-4 w-full">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800 mt-0">은퇴 후 인출 전략</h3>

            <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">전략 선택</label>
                <div className="relative">
                    <select
                        className="w-full appearance-none bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg py-2 pl-3 pr-10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                        value={withdrawal.strategy}
                        onChange={(e) => updateField("strategy", e.target.value)}
                    >
                        {STRATEGIES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {STRATEGIES.find(s => s.id === withdrawal.strategy)?.desc}
                </div>
            </div>

            {/* Strategy specific inputs */}
            {withdrawal.strategy === "target_spending" && (
                <div className="flex flex-col gap-1.5 mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">월 목표 생활비</label>
                    <input
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        type="number"
                        value={withdrawal.targetMonthlySpending}
                        onChange={(e) => updateField("targetMonthlySpending", Number(e.target.value))}
                    />
                </div>
            )}

            {withdrawal.strategy === "fixed_amount" && (
                <div className="flex flex-col gap-1.5 mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">월 고정 인출액</label>
                    <input
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        type="number"
                        value={withdrawal.fixedMonthlyAmount}
                        onChange={(e) => updateField("fixedMonthlyAmount", Number(e.target.value))}
                    />
                </div>
            )}

            {withdrawal.strategy === "fixed_percentage" && (
                <div className="flex flex-col gap-1.5 mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연 인출 비율 (0~1)</label>
                    <input
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        type="number" step="0.005"
                        value={withdrawal.percentageRate}
                        placeholder="예: 0.04"
                        onChange={(e) => updateField("percentageRate", Number(e.target.value))}
                    />
                </div>
            )}

            {withdrawal.strategy === "safe_withdrawal_rate" && (
                <div className="flex flex-col gap-1.5 mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">초기 인출 비율 (0~1)</label>
                    <input
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        type="number" step="0.005"
                        value={withdrawal.initialSafeRate ?? 0.04}
                        placeholder="기본값: 0.04 (4%)"
                        onChange={(e) => updateField("initialSafeRate", Number(e.target.value))}
                    />
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm text-blue-800 dark:text-blue-300 font-medium">
                        <span className="font-bold">* </span>
                        목표 생활비는 자동으로 계산됩니다 (은퇴 시 자산 * 4% / 12)
                    </div>
                </div>
            )}

            {withdrawal.strategy === "vpw" && (
                <div className="flex flex-col gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-400 mb-2">
                        VPW는 기대 수명과 포트폴리오 수익률에 따라 매년 최적의 인출률을 계산합니다.
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">최대 인출률 상한 (선택사항, 0~1)</label>
                        <input
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            type="number" step="0.01"
                            value={withdrawal.vpwMaxWithdrawalRate || ""}
                            placeholder="예: 0.1 (10%)"
                            onChange={(e) => updateField("vpwMaxWithdrawalRate", e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">최소 인출률 하한 (선택사항, 0~1)</label>
                        <input
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            type="number" step="0.01"
                            value={withdrawal.vpwMinWithdrawalRate || ""}
                            placeholder="예: 0.02 (2%)"
                            onChange={(e) => updateField("vpwMinWithdrawalRate", e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </div>
                </div>
            )}

            <div className="h-px bg-slate-100 dark:bg-zinc-800 my-6" />

            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">세금 설정</h4>
            <div>
                <div className="flex flex-col gap-1.5 mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">세금 방식</label>
                    <div className="relative">
                        <select
                            className="w-full appearance-none bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg py-2 pl-3 pr-10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            value={withdrawal.taxStrategy || "simple"}
                            onChange={(e) => updateField("taxStrategy", e.target.value)}
                        >
                            <option value="simple">단일 세율 (Simple)</option>
                            <option value="detailed">종합과세 누진세율 (Detailed)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {(!withdrawal.taxStrategy || withdrawal.taxStrategy === "simple") && (
                        <div className="mt-4 flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">인출 시 예상 실효세율 (0~1)</label>
                            <input
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                type="number" step="0.01" max="0.5"
                                value={withdrawal.taxRate}
                                onChange={(e) => updateField("taxRate", Number(e.target.value))}
                            />
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                예: 연금저축/IRP(3.3%~5.5%), 해외주식(22%), 일반계좌(15.4%).
                            </div>
                        </div>
                    )}

                    {withdrawal.taxStrategy === "detailed" && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm text-blue-800 dark:text-blue-300 font-medium">
                            <span className="font-bold">* </span>
                            연금 + 인출액 합계에 대해 한국 소득세 기본세율(6%~45%)과 누진공제를 적용하여 세금을 계산합니다.<br />
                            <span className="text-blue-600/80 dark:text-blue-400/80">(기본공제 150만원 가정, 지방소득세 별도)</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
