/**
 * Advanced Settings Component
 * Contains settings for Phase 1-2 features:
 * - Inflation scenarios
 * - Health insurance
 * - Tax credits
 * - Severance
 * - Reverse annuity
 */
import React, { useState } from 'react';
import { SimulationInput, InflationScenario, HealthInsurance, SeveranceSettings, ReverseAnnuity, GuardrailsSettings, BucketSettings, LongevityRisk, RebalancingSettings } from '../logic/types';

interface Props {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

const INFLATION_PRESETS: { type: InflationScenario['type']; label: string; rate: number }[] = [
    { type: 'low', label: '저인플레 (1.5%)', rate: 0.015 },
    { type: 'normal', label: '정상 (2.0%)', rate: 0.02 },
    { type: 'high', label: '고인플레 (3.5%)', rate: 0.035 },
    { type: 'spike', label: '스파이크 시나리오', rate: 0.02 }
];

export function AdvancedSettings({ input, onChange }: Props) {
    const [expandedSections, setExpandedSections] = useState<string[]>(['inflation']);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const isExpanded = (section: string) => expandedSections.includes(section);

    // Update helpers
    const updateInflation = (scenario: Partial<InflationScenario>) => {
        onChange({
            ...input,
            inflation_scenario: { ...input.inflation_scenario, ...scenario } as InflationScenario
        });
    };

    const updateHealthInsurance = (hi: Partial<HealthInsurance>) => {
        onChange({
            ...input,
            health_insurance: { ...input.health_insurance, ...hi } as HealthInsurance
        });
    };

    const updateSeverance = (sv: Partial<SeveranceSettings>) => {
        onChange({
            ...input,
            severance: { ...input.severance, ...sv } as SeveranceSettings
        });
    };

    const updateReverseAnnuity = (ra: Partial<ReverseAnnuity>) => {
        onChange({
            ...input,
            reverse_annuity: { ...input.reverse_annuity, ...ra } as ReverseAnnuity
        });
    };

    const updateGuardrails = (gr: Partial<GuardrailsSettings>) => {
        onChange({
            ...input,
            guardrails: { ...input.guardrails, ...gr } as GuardrailsSettings
        });
    };

    const updateBucket = (bk: Partial<BucketSettings>) => {
        onChange({
            ...input,
            bucket: { ...input.bucket, ...bk } as BucketSettings
        });
    };

    const updateLongevity = (lr: Partial<LongevityRisk>) => {
        onChange({
            ...input,
            longevity_risk: { ...input.longevity_risk, ...lr } as LongevityRisk
        });
    };

    // Phase 7: Rebalancing
    const updateRebalancing = (rb: Partial<RebalancingSettings>) => {
        onChange({
            ...input,
            rebalancing: { ...input.rebalancing, ...rb } as RebalancingSettings
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-4 border-b border-transparent">⚙️ 고급 설정</h3>

            {/* Inflation Scenario */}
            <CollapsibleSection
                title="📈 인플레이션 시나리오"
                isOpen={isExpanded('inflation')}
                onToggle={() => toggleSection('inflation')}
            >
                <div className="flex flex-wrap mb-4 gap-2">
                    {INFLATION_PRESETS.map(preset => (
                        <button
                            key={preset.type}
                            onClick={() => updateInflation({ type: preset.type, baseRate: preset.rate })}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${input.inflation_scenario?.type === preset.type ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {input.inflation_scenario?.type === 'spike' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">스파이크 시작 연령</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={input.inflation_scenario.spikeStartAge || 65}
                                onChange={e => updateInflation({ spikeStartAge: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">스파이크 기간 (년)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={input.inflation_scenario.spikeDurationYears || 3}
                                onChange={e => updateInflation({ spikeDurationYears: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">스파이크 인플레율</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.01"
                                value={input.inflation_scenario.spikeRate || 0.06}
                                onChange={e => updateInflation({ spikeRate: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                )}
            </CollapsibleSection>

            {/* Health Insurance */}
            <CollapsibleSection
                title="🏥 건강보험료 (지역가입자)"
                isOpen={isExpanded('health')}
                onToggle={() => toggleSection('health')}
            >
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={input.health_insurance?.enabled ?? false}
                        onChange={e => updateHealthInsurance({ enabled: e.target.checked })}
                    />
                    은퇴 후 건강보험료 지출 반영
                </label>
                {input.health_insurance?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-row gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="hi_mode"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={input.health_insurance.mode !== 'detailed'}
                                    onChange={() => updateHealthInsurance({ mode: 'simple' })}
                                />
                                간편 입력
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="hi_mode"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={input.health_insurance.mode === 'detailed'}
                                    onChange={() => updateHealthInsurance({ mode: 'detailed' })}
                                />
                                상세 계산 (지역가입자)
                            </label>
                        </div>

                        {input.health_insurance.mode === 'detailed' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                            checked={input.health_insurance.isDependent ?? false}
                                            onChange={e => updateHealthInsurance({ isDependent: e.target.checked })}
                                        />
                                        피부양자 자격 유지 (보험료 0원)
                                    </label>
                                </div>
                                {!input.health_insurance.isDependent && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">주택/건물 과세표준액 (시세의 약 60%)</label>
                                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                                <input
                                                    type="number"
                                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                                    value={input.health_insurance.propertyValue || 0}
                                                    onChange={e => updateHealthInsurance({ propertyValue: Number(e.target.value) })}
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
                                                    value={input.health_insurance.carValue || 0}
                                                    onChange={e => updateHealthInsurance({ carValue: Number(e.target.value) })}
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
                                            value={input.health_insurance.monthlyPremium || 200000}
                                            onChange={e => updateHealthInsurance({ monthlyPremium: Number(e.target.value) })}
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
                                    checked={input.health_insurance.inflationLinked ?? true}
                                    onChange={e => updateHealthInsurance({ inflationLinked: e.target.checked })}
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

            {/* Severance */}
            <CollapsibleSection
                title="💼 퇴직금"
                isOpen={isExpanded('severance')}
                onToggle={() => toggleSection('severance')}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={input.severance?.enabled ?? false}
                        onChange={e => updateSeverance({ enabled: e.target.checked })}
                    />
                    퇴직금 시뮬레이션
                </label>
                {input.severance?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">예상 퇴직금</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={input.severance.estimatedAmount || 0}
                                    onChange={e => updateSeverance({ estimatedAmount: Number(e.target.value) })}
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
                                    checked={input.severance.payoutType === 'lump_sum'}
                                    onChange={() => updateSeverance({ payoutType: 'lump_sum' })}
                                />
                                일시금 수령
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="radio"
                                    name="severance_type"
                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                    checked={input.severance.payoutType === 'annuity'}
                                    onChange={() => updateSeverance({ payoutType: 'annuity' })}
                                />
                                연금화
                            </label>
                        </div>
                        {input.severance.payoutType === 'annuity' && (
                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연금 수령 기간 (년)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={input.severance.annuityYears || 10}
                                    onChange={e => updateSeverance({ annuityYears: Number(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            {/* Reverse Annuity */}
            <CollapsibleSection
                title="🏠 주택연금"
                isOpen={isExpanded('reverse')}
                onToggle={() => toggleSection('reverse')}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={input.reverse_annuity?.enabled ?? false}
                        onChange={e => updateReverseAnnuity({ enabled: e.target.checked })}
                    />
                    주택연금 활용
                </label>
                {input.reverse_annuity?.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">주택 시가</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={input.reverse_annuity.houseValue || 0}
                                    onChange={e => updateReverseAnnuity({ houseValue: Number(e.target.value) })}
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
                                    value={input.reverse_annuity.startAge || 65}
                                    onChange={e => updateReverseAnnuity({ startAge: Number(e.target.value) })}
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
                                    value={input.reverse_annuity.monthlyPayment || 0}
                                    onChange={e => updateReverseAnnuity({ monthlyPayment: Number(e.target.value) })}
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

            {/* Guardrails Strategy (shown only if strategy is guardrails) */}
            {input.withdrawal.strategy === 'guardrails' && (
                <CollapsibleSection
                    title="🛡️ Guardrails 설정"
                    isOpen={isExpanded('guardrails')}
                    onToggle={() => toggleSection('guardrails')}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">기본 인출률</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.005"
                                value={input.guardrails?.baseRate || 0.04}
                                onChange={e => updateGuardrails({ baseRate: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">상한 인출률</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.005"
                                value={input.guardrails?.upperThreshold || 0.05}
                                onChange={e => updateGuardrails({ upperThreshold: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">하한 인출률</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.005"
                                value={input.guardrails?.lowerThreshold || 0.03}
                                onChange={e => updateGuardrails({ lowerThreshold: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">조정 폭</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                step="0.05"
                                value={input.guardrails?.adjustmentRate || 0.1}
                                onChange={e => updateGuardrails({ adjustmentRate: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* Auto-Rebalancing (Phase 7) */}
            <CollapsibleSection
                title="⚖️ 자동 리밸런싱"
                isOpen={isExpanded('rebalancing')}
                onToggle={() => toggleSection('rebalancing')}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={input.rebalancing?.enabled ?? false}
                        onChange={e => updateRebalancing({ enabled: e.target.checked })}
                    />
                    포트폴리오 자동 리밸런싱
                </label>
                {input.rebalancing?.enabled && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">리밸런싱 주기</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg py-2 pl-3 pr-10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                    value={input.rebalancing.frequency || 'annual'}
                                    onChange={e => updateRebalancing({ frequency: e.target.value as RebalancingSettings['frequency'] })}
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
                        {input.rebalancing.frequency === 'threshold' && (
                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">임계값 (%)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    step="1"
                                    value={(input.rebalancing.thresholdPercent || 0.05) * 100}
                                    onChange={e => updateRebalancing({ thresholdPercent: Number(e.target.value) / 100 })}
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
                                    value={(input.rebalancing.tradingCostPercent || 0.001) * 100}
                                    onChange={e => updateRebalancing({ tradingCostPercent: Number(e.target.value) / 100 })}
                                />
                            </div>
                            <div className="flex items-center sm:mt-6">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                                        checked={input.rebalancing.taxEfficient ?? false}
                                        onChange={e => updateRebalancing({ taxEfficient: e.target.checked })}
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

            {/* Longevity Risk */}
            <CollapsibleSection
                title="📆 장수 리스크"
                isOpen={isExpanded('longevity')}
                onToggle={() => toggleSection('longevity')}
            >
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                        checked={input.longevity_risk?.useDistribution ?? false}
                        onChange={e => updateLongevity({ useDistribution: e.target.checked })}
                    />
                    확률적 기대 수명 적용
                </label>
                {input.longevity_risk?.useDistribution && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">평균 기대 수명</label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="number"
                                    className="flex-1 w-full px-3 py-2 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={input.longevity_risk.averageLifeExpectancy || 85}
                                    onChange={e => updateLongevity({ averageLifeExpectancy: Number(e.target.value) })}
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
                                    value={input.longevity_risk.stdDevYears || 5}
                                    onChange={e => updateLongevity({ stdDevYears: Number(e.target.value) })}
                                />
                                <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold select-none">년</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                    * 활성화 시 시뮬레이션마다 다른 종료 연령 적용 (몬테카를로 모드)
                </div>
            </CollapsibleSection>
        </div>
    );
}

// Collapsible Section Helper
function CollapsibleSection({
    title,
    isOpen,
    onToggle,
    children
}: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden mb-3 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50"
            >
                <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{title}</span>
                <span className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 text-sm ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 border-t border-slate-100 dark:border-zinc-800' : 'max-h-0 opacity-0 border-t-0'}`}>
                <div className="p-4 bg-white dark:bg-zinc-900/50">
                    {children}
                </div>
            </div>
        </div>
    );
}
