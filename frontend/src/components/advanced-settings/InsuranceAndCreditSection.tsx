import type { HealthInsurance, TaxCredit } from "../../logic/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface InsuranceAndCreditSectionProps {
    healthInsurance?: HealthInsurance;
    taxCredit?: TaxCredit;
    healthOpen: boolean;
    taxOpen: boolean;
    onToggleHealth: () => void;
    onToggleTax: () => void;
    onUpdateHealthInsurance: (patch: Partial<HealthInsurance>) => void;
    onUpdateTaxCredit: (patch: Partial<TaxCredit>) => void;
}

export function InsuranceAndCreditSection({
    healthInsurance,
    taxCredit,
    healthOpen,
    taxOpen,
    onToggleHealth,
    onToggleTax,
    onUpdateHealthInsurance,
    onUpdateTaxCredit
}: InsuranceAndCreditSectionProps) {
    return (
        <>
            <CollapsibleSection
                title="🏥 건강보험료 (지역가입자)"
                isOpen={healthOpen}
                onToggle={onToggleHealth}
            >
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={healthInsurance?.enabled ?? false}
                        onChange={(e) => onUpdateHealthInsurance({ enabled: e.target.checked })}
                    />
                    은퇴 후 건강보험료 지출 반영
                </label>
                {healthInsurance?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-row gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="hi_mode"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={healthInsurance.mode !== "detailed"}
                                    onChange={() => onUpdateHealthInsurance({ mode: "simple" })}
                                />
                                간편 입력
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="hi_mode"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={healthInsurance.mode === "detailed"}
                                    onChange={() => onUpdateHealthInsurance({ mode: "detailed" })}
                                />
                                상세 계산 (지역가입자)
                            </label>
                        </div>

                        {healthInsurance.mode === "detailed" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                            checked={healthInsurance.isDependent ?? false}
                                            onChange={(e) => onUpdateHealthInsurance({ isDependent: e.target.checked })}
                                        />
                                        피부양자 자격 유지 (보험료 0원)
                                    </label>
                                </div>
                                {!healthInsurance.isDependent && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">주택/건물 과세표준액 (시세의 약 60%)</label>
                                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                                <input
                                                    type="number"
                                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                                    value={healthInsurance.propertyValue || 0}
                                                    onChange={(e) => onUpdateHealthInsurance({ propertyValue: Number(e.target.value) })}
                                                />
                                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">원</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">차량 가액 (4천만원 이상만 반영)</label>
                                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                                <input
                                                    type="number"
                                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                                    value={healthInsurance.carValue || 0}
                                                    onChange={(e) => onUpdateHealthInsurance({ carValue: Number(e.target.value) })}
                                                />
                                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">원</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1 sm:col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            * 소득 점수는 시뮬레이션 된 연금/이자 소득으로 자동 계산됩니다.
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">월 보험료</label>
                                    <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                        <input
                                            type="number"
                                            className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                            value={healthInsurance.monthlyPremium || 200000}
                                            onChange={(e) => onUpdateHealthInsurance({ monthlyPremium: Number(e.target.value) })}
                                        />
                                        <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">원</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-zinc-700/50 flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={healthInsurance.inflationLinked ?? true}
                                    onChange={(e) => onUpdateHealthInsurance({ inflationLinked: e.target.checked })}
                                />
                                물가 연동
                            </label>
                        </div>
                    </div>
                )}
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                    * 2024년 지역가입자 평균: 약 20만원 (장기요양 포함)
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                title="🧾 세액공제 (연금저축/IRP)"
                isOpen={taxOpen}
                onToggle={onToggleTax}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={taxCredit?.enabled ?? false}
                        onChange={(e) => onUpdateTaxCredit({ enabled: e.target.checked })}
                    />
                    세액공제 반영
                </label>

                {taxCredit?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">공제 모델</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <input
                                        type="radio"
                                        name="tax_credit_mode"
                                        checked={(taxCredit.mode ?? "law_2026") === "law_2026"}
                                        onChange={() => onUpdateTaxCredit({ mode: "law_2026", lawYear: 2026, incomeBasis: "simulated_taxable_income" })}
                                    />
                                    세법 연동 (2026)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <input
                                        type="radio"
                                        name="tax_credit_mode"
                                        checked={taxCredit.mode === "manual"}
                                        onChange={() => onUpdateTaxCredit({ mode: "manual" })}
                                    />
                                    수동 공제율
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연금저축 납입액 (연)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                    value={taxCredit.pensionSavingsContribution ?? 0}
                                    onChange={(e) => onUpdateTaxCredit({ pensionSavingsContribution: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">IRP 납입액 (연)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                    value={taxCredit.irpContribution ?? 0}
                                    onChange={(e) => onUpdateTaxCredit({ irpContribution: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        {taxCredit.mode === "manual" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">수동 공제율 (0~1)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white"
                                    value={taxCredit.creditRate ?? 0.15}
                                    onChange={(e) => onUpdateTaxCredit({ creditRate: Number(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>
                )}
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                    * 세법 연동 모드는 2026년 기준 공제율/한도를 적용하며 과세소득(시뮬레이션)을 사용합니다.
                </div>
            </CollapsibleSection>
        </>
    );
}
