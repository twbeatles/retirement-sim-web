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
        <div className="card">
            <h3 className="card-header">⚙️ 고급 설정</h3>

            {/* Inflation Scenario */}
            <CollapsibleSection
                title="📈 인플레이션 시나리오"
                isOpen={isExpanded('inflation')}
                onToggle={() => toggleSection('inflation')}
            >
                <div className="flex-row flex-wrap mb-3 gap-2">
                    {INFLATION_PRESETS.map(preset => (
                        <button
                            key={preset.type}
                            onClick={() => updateInflation({ type: preset.type, baseRate: preset.rate })}
                            className={`btn btn-pill ${input.inflation_scenario?.type === preset.type ? 'btn-primary' : ''}`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {input.inflation_scenario?.type === 'spike' && (
                    <div className="grid-2-cols gap-2">
                        <div>
                            <label className="label text-xs">스파이크 시작 연령</label>
                            <input
                                type="number"
                                className="input"
                                value={input.inflation_scenario.spikeStartAge || 65}
                                onChange={e => updateInflation({ spikeStartAge: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">스파이크 기간 (년)</label>
                            <input
                                type="number"
                                className="input"
                                value={input.inflation_scenario.spikeDurationYears || 3}
                                onChange={e => updateInflation({ spikeDurationYears: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">스파이크 인플레율</label>
                            <input
                                type="number"
                                className="input"
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
                <label className="checkbox-label mb-3">
                    <input
                        type="checkbox"
                        checked={input.health_insurance?.enabled ?? false}
                        onChange={e => updateHealthInsurance({ enabled: e.target.checked })}
                    />
                    은퇴 후 건강보험료 지출 반영
                </label>
                {input.health_insurance?.enabled && (
                    <div className="flex flex-col gap-3">
                        <div className="flex-row gap-3">
                            <label className="checkbox-label text-sm">
                                <input
                                    type="radio"
                                    name="hi_mode"
                                    checked={input.health_insurance.mode !== 'detailed'}
                                    onChange={() => updateHealthInsurance({ mode: 'simple' })}
                                />
                                간편 입력
                            </label>
                            <label className="checkbox-label text-sm">
                                <input
                                    type="radio"
                                    name="hi_mode"
                                    checked={input.health_insurance.mode === 'detailed'}
                                    onChange={() => updateHealthInsurance({ mode: 'detailed' })}
                                />
                                상세 계산 (지역가입자)
                            </label>
                        </div>

                        {input.health_insurance.mode === 'detailed' ? (
                            <div className="grid-2-cols gap-2">
                                <div className="col-span-2">
                                    <label className="checkbox-label text-sm mb-2">
                                        <input
                                            type="checkbox"
                                            checked={input.health_insurance.isDependent ?? false}
                                            onChange={e => updateHealthInsurance({ isDependent: e.target.checked })}
                                        />
                                        피부양자 자격 유지 (보험료 0원)
                                    </label>
                                </div>
                                {!input.health_insurance.isDependent && (
                                    <>
                                        <div>
                                            <label className="label text-xs">주택/건물 과세표준액 (시세의 약 60%)</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    className="input"
                                                    value={input.health_insurance.propertyValue || 0}
                                                    onChange={e => updateHealthInsurance({ propertyValue: Number(e.target.value) })}
                                                />
                                                <span className="input-unit text-xs">원</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label text-xs">차량 가액 (4천만원 이상만 반영)</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    className="input"
                                                    value={input.health_insurance.carValue || 0}
                                                    onChange={e => updateHealthInsurance({ carValue: Number(e.target.value) })}
                                                />
                                                <span className="input-unit text-xs">원</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-xs text-sub">
                                            * 소득 점수는 시뮬레이션 된 연금/이자 소득으로 자동 계산됩니다.
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid-2-cols gap-2">
                                <div>
                                    <label className="label text-xs">월 보험료</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={input.health_insurance.monthlyPremium || 200000}
                                        onChange={e => updateHealthInsurance({ monthlyPremium: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center mt-1">
                            <label className="checkbox-label text-sm">
                                <input
                                    type="checkbox"
                                    checked={input.health_insurance.inflationLinked ?? true}
                                    onChange={e => updateHealthInsurance({ inflationLinked: e.target.checked })}
                                />
                                물가 연동
                            </label>
                        </div>
                    </div>
                )}
                <div className="text-xs text-sub mt-2">
                    * 2024년 지역가입자 평균: 약 20만원 (장기요양 포함)
                </div>
            </CollapsibleSection>

            {/* Severance */}
            <CollapsibleSection
                title="💼 퇴직금"
                isOpen={isExpanded('severance')}
                onToggle={() => toggleSection('severance')}
            >
                <label className="checkbox-label mb-3">
                    <input
                        type="checkbox"
                        checked={input.severance?.enabled ?? false}
                        onChange={e => updateSeverance({ enabled: e.target.checked })}
                    />
                    퇴직금 시뮬레이션
                </label>
                {input.severance?.enabled && (
                    <>
                        <div className="mb-3">
                            <label className="label text-xs">예상 퇴직금</label>
                            <input
                                type="number"
                                className="input"
                                value={input.severance.estimatedAmount || 0}
                                onChange={e => updateSeverance({ estimatedAmount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex-row mb-3 gap-3">
                            <label className="checkbox-label text-sm">
                                <input
                                    type="radio"
                                    name="severance_type"
                                    checked={input.severance.payoutType === 'lump_sum'}
                                    onChange={() => updateSeverance({ payoutType: 'lump_sum' })}
                                />
                                일시금 수령
                            </label>
                            <label className="checkbox-label text-sm">
                                <input
                                    type="radio"
                                    name="severance_type"
                                    checked={input.severance.payoutType === 'annuity'}
                                    onChange={() => updateSeverance({ payoutType: 'annuity' })}
                                />
                                연금화
                            </label>
                        </div>
                        {input.severance.payoutType === 'annuity' && (
                            <div>
                                <label className="label text-xs">연금 수령 기간 (년)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={input.severance.annuityYears || 10}
                                    onChange={e => updateSeverance({ annuityYears: Number(e.target.value) })}
                                />
                            </div>
                        )}
                    </>
                )}
            </CollapsibleSection>

            {/* Reverse Annuity */}
            <CollapsibleSection
                title="🏠 주택연금"
                isOpen={isExpanded('reverse')}
                onToggle={() => toggleSection('reverse')}
            >
                <label className="checkbox-label mb-3">
                    <input
                        type="checkbox"
                        checked={input.reverse_annuity?.enabled ?? false}
                        onChange={e => updateReverseAnnuity({ enabled: e.target.checked })}
                    />
                    주택연금 활용
                </label>
                {input.reverse_annuity?.enabled && (
                    <div className="grid-2-cols gap-2">
                        <div>
                            <label className="label text-xs">주택 시가</label>
                            <input
                                type="number"
                                className="input"
                                value={input.reverse_annuity.houseValue || 0}
                                onChange={e => updateReverseAnnuity({ houseValue: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">수령 시작 나이</label>
                            <input
                                type="number"
                                className="input"
                                value={input.reverse_annuity.startAge || 65}
                                onChange={e => updateReverseAnnuity({ startAge: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">예상 월 수령액</label>
                            <input
                                type="number"
                                className="input"
                                value={input.reverse_annuity.monthlyPayment || 0}
                                onChange={e => updateReverseAnnuity({ monthlyPayment: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                )}
                <div className="text-xs text-sub mt-2">
                    * <a href="https://www.hf.go.kr" target="_blank" rel="noopener">HF 주택연금</a>에서 예상 수령액 계산 가능
                </div>
            </CollapsibleSection>

            {/* Guardrails Strategy (shown only if strategy is guardrails) */}
            {input.withdrawal.strategy === 'guardrails' && (
                <CollapsibleSection
                    title="🛡️ Guardrails 설정"
                    isOpen={isExpanded('guardrails')}
                    onToggle={() => toggleSection('guardrails')}
                >
                    <div className="grid-2-cols gap-2">
                        <div>
                            <label className="label text-xs">기본 인출률</label>
                            <input
                                type="number"
                                className="input"
                                step="0.005"
                                value={input.guardrails?.baseRate || 0.04}
                                onChange={e => updateGuardrails({ baseRate: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">상한 인출률</label>
                            <input
                                type="number"
                                className="input"
                                step="0.005"
                                value={input.guardrails?.upperThreshold || 0.05}
                                onChange={e => updateGuardrails({ upperThreshold: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">하한 인출률</label>
                            <input
                                type="number"
                                className="input"
                                step="0.005"
                                value={input.guardrails?.lowerThreshold || 0.03}
                                onChange={e => updateGuardrails({ lowerThreshold: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">조정 폭</label>
                            <input
                                type="number"
                                className="input"
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
                <label className="checkbox-label mb-3">
                    <input
                        type="checkbox"
                        checked={input.rebalancing?.enabled ?? false}
                        onChange={e => updateRebalancing({ enabled: e.target.checked })}
                    />
                    포트폴리오 자동 리밸런싱
                </label>
                {input.rebalancing?.enabled && (
                    <>
                        <div className="mb-3">
                            <label className="label text-xs">리밸런싱 주기</label>
                            <select
                                className="select"
                                value={input.rebalancing.frequency || 'annual'}
                                onChange={e => updateRebalancing({ frequency: e.target.value as RebalancingSettings['frequency'] })}
                            >
                                <option value="monthly">매월</option>
                                <option value="quarterly">분기별</option>
                                <option value="semi-annual">반기별</option>
                                <option value="annual">연간</option>
                                <option value="threshold">임계값 초과시</option>
                            </select>
                        </div>
                        {input.rebalancing.frequency === 'threshold' && (
                            <div className="mb-3">
                                <label className="label text-xs">임계값 (%)</label>
                                <input
                                    type="number"
                                    className="input"
                                    step="1"
                                    value={(input.rebalancing.thresholdPercent || 0.05) * 100}
                                    onChange={e => updateRebalancing({ thresholdPercent: Number(e.target.value) / 100 })}
                                />
                            </div>
                        )}
                        <div className="grid-2-cols gap-2">
                            <div>
                                <label className="label text-xs">거래 비용 (%)</label>
                                <input
                                    type="number"
                                    className="input"
                                    step="0.01"
                                    value={(input.rebalancing.tradingCostPercent || 0.001) * 100}
                                    onChange={e => updateRebalancing({ tradingCostPercent: Number(e.target.value) / 100 })}
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="checkbox-label text-sm">
                                    <input
                                        type="checkbox"
                                        checked={input.rebalancing.taxEfficient ?? false}
                                        onChange={e => updateRebalancing({ taxEfficient: e.target.checked })}
                                    />
                                    세금 효율적
                                </label>
                            </div>
                        </div>
                    </>
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
                <label className="checkbox-label mb-3">
                    <input
                        type="checkbox"
                        checked={input.longevity_risk?.useDistribution ?? false}
                        onChange={e => updateLongevity({ useDistribution: e.target.checked })}
                    />
                    확률적 기대 수명 적용
                </label>
                {input.longevity_risk?.useDistribution && (
                    <div className="grid-2-cols gap-2">
                        <div>
                            <label className="label text-xs">평균 기대 수명</label>
                            <input
                                type="number"
                                className="input"
                                value={input.longevity_risk.averageLifeExpectancy || 85}
                                onChange={e => updateLongevity({ averageLifeExpectancy: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label text-xs">표준편차 (년)</label>
                            <input
                                type="number"
                                className="input"
                                value={input.longevity_risk.stdDevYears || 5}
                                onChange={e => updateLongevity({ stdDevYears: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                )}
                <div className="text-xs text-sub mt-2">
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
        <div className="advanced-section">
            <button
                onClick={onToggle}
                className="advanced-section-toggle"
            >
                {title}
                <span className="advanced-section-arrow">{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && <div className="mt-2">{children}</div>}
        </div>
    );
}
