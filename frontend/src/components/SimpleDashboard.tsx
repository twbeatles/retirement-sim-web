import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { SimulationInput, SimulationResult } from '../logic/types';
import { InputSlider } from './ui/InputSlider';

interface SimpleDashboardProps {
    input: SimulationInput;
    result: SimulationResult | null;
    onInputChange: (input: SimulationInput) => void;
}

const STEPS = [
    { id: 'basic', title: '기본 정보', icon: '📋', description: '나이와 은퇴 목표를 설정하세요' },
    { id: 'assets', title: '자산 현황', icon: '💰', description: '현재 보유 자산을 입력하세요' },
    { id: 'savings', title: '저축 계획', icon: '🏦', description: '월 저축 금액을 설정하세요' },
    { id: 'result', title: '결과 확인', icon: '📊', description: '은퇴 준비도를 확인하세요' }
];

const PRESETS = [
    { id: 'worker', label: '직장인', icon: '👔', savings: 1000000, asset: 50000000 },
    { id: 'public', label: '공무원', icon: '🏛️', savings: 800000, asset: 30000000 },
    { id: 'self', label: '자영업자', icon: '🏪', savings: 1500000, asset: 80000000 }
];

function num(v: string) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

export const SimpleDashboard = React.memo(function SimpleDashboard({ input, result, onInputChange }: SimpleDashboardProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const successRate = result?.summary.successRate ?? 0;
    const endAsset = result?.summary.mc?.totalAssetsReal.p50 ?? 0;
    const currentAsset = input.general.current_balance + input.private_pension.current_balance;
    const yearsToRetire = Math.max(0, input.retire_age - input.current_age);

    const pieData = [
        { name: 'Success', value: successRate },
        { name: 'Fail', value: 1 - successRate }
    ];

    const getScoreColor = (rate: number) => {
        if (rate >= 0.9) return 'var(--success)';
        if (rate >= 0.7) return '#22c55e';
        if (rate >= 0.5) return 'var(--warning)';
        return 'var(--danger)';
    };

    const getFeedback = (rate: number) => {
        if (rate >= 0.9) return { emoji: '🎉', text: '아주 훌륭합니다! 은퇴 준비가 잘 되어 있어요.' };
        if (rate >= 0.7) return { emoji: '😊', text: '양호합니다. 조금만 더 저축하면 완벽해요!' };
        if (rate >= 0.5) return { emoji: '🤔', text: '주의가 필요합니다. 저축액을 늘려보세요.' };
        return { emoji: '⚠️', text: '대책이 필요합니다. 은퇴 계획을 점검하세요.' };
    };

    const feedback = getFeedback(successRate);
    const scoreColor = getScoreColor(successRate);

    const handlePreset = (preset: typeof PRESETS[0]) => {
        onInputChange({
            ...input,
            general: {
                ...input.general,
                current_balance: preset.asset,
                monthly_contribution: preset.savings
            }
        });
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const goToStep = (index: number) => {
        setCurrentStep(index);
    };

    return (
        <div className="simple-dashboard-v2">
            {/* Progress Steps */}
            <div className="wizard-progress">
                {STEPS.map((step, index) => (
                    <button
                        key={step.id}
                        className={`wizard-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                        onClick={() => goToStep(index)}
                    >
                        <span className="wizard-step-icon">{index < currentStep ? '✓' : step.icon}</span>
                        <span className="wizard-step-title">{step.title}</span>
                    </button>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="wizard-progress-bar">
                <div
                    className="wizard-progress-fill"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
            </div>

            {/* Step Content */}
            <div className="wizard-content">
                {currentStep === 0 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">{STEPS[0].icon} {STEPS[0].title}</h2>
                        <p className="wizard-desc">{STEPS[0].description}</p>

                        <div className="wizard-form">
                            <InputSlider
                                label="현재 나이"
                                value={input.current_age}
                                onChange={(v) => onInputChange({ ...input, current_age: v })}
                                min={20}
                                max={70}
                                unit="세"
                                hint="💡 정확한 나이를 입력하면 더 정확한 계산이 가능해요"
                            />
                            <InputSlider
                                label="은퇴 목표 나이"
                                value={input.retire_age}
                                onChange={(v) => onInputChange({ ...input, retire_age: v })}
                                min={Math.max(input.current_age + 1, 40)}
                                max={80}
                                unit="세"
                                hint={`지금부터 ${yearsToRetire}년 후 은퇴 예정`}
                            />
                            <InputSlider
                                label="기대 수명"
                                value={input.end_age}
                                onChange={(v) => onInputChange({ ...input, end_age: v })}
                                min={Math.max(input.retire_age + 5, 70)}
                                max={100}
                                unit="세"
                                hint="💡 한국인 평균 기대수명은 약 83세입니다"
                            />
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">{STEPS[1].icon} {STEPS[1].title}</h2>
                        <p className="wizard-desc">{STEPS[1].description}</p>

                        {/* Quick Presets */}
                        <div className="preset-cards">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    className="preset-card"
                                    onClick={() => handlePreset(preset)}
                                >
                                    <span className="preset-icon">{preset.icon}</span>
                                    <span className="preset-label">{preset.label}</span>
                                    <span className="preset-value">{(preset.asset / 10000).toLocaleString()}만원</span>
                                </button>
                            ))}
                        </div>

                        <div className="wizard-form">
                            <InputSlider
                                label="현재 모은 돈 (총 자산)"
                                value={Math.round(input.general.current_balance / 10000)}
                                onChange={(v) => onInputChange({
                                    ...input,
                                    general: { ...input.general, current_balance: v * 10000 }
                                })}
                                min={0}
                                max={100000}
                                step={100}
                                unit="만원"
                                formatValue={(v) => v.toLocaleString()}
                                hint="💡 예금, 주식, 연금저축 등 모든 금융자산 합계"
                            />
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">{STEPS[2].icon} {STEPS[2].title}</h2>
                        <p className="wizard-desc">{STEPS[2].description}</p>

                        <div className="wizard-form">
                            <InputSlider
                                label="매월 저축 가능액"
                                value={Math.round(input.general.monthly_contribution / 10000)}
                                onChange={(v) => onInputChange({
                                    ...input,
                                    general: { ...input.general, monthly_contribution: v * 10000 }
                                })}
                                min={0}
                                max={1000}
                                step={10}
                                unit="만원"
                                formatValue={(v) => v.toLocaleString()}
                                hint={`연간 저축액: ${(input.general.monthly_contribution * 12 / 10000).toLocaleString()}만원`}
                            />

                            <div className="savings-summary">
                                <div className="savings-item">
                                    <span className="savings-label">은퇴까지 예상 저축 합계</span>
                                    <span className="savings-value">
                                        {Math.round((input.general.monthly_contribution * 12 * yearsToRetire) / 100000000).toLocaleString()}억원
                                    </span>
                                </div>
                                <div className="savings-item">
                                    <span className="savings-label">현재 자산 + 저축</span>
                                    <span className="savings-value highlight">
                                        {Math.round((currentAsset + input.general.monthly_contribution * 12 * yearsToRetire) / 100000000).toLocaleString()}억원
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">{STEPS[3].icon} 은퇴 준비도 분석 결과</h2>

                        <div className="result-grid">
                            {/* Score Gauge */}
                            <div className="result-score-card">
                                <div className="gauge-container">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="100%"
                                                startAngle={180}
                                                endAngle={0}
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                <Cell fill={scoreColor} />
                                                <Cell fill="var(--border)" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="gauge-score" style={{ color: scoreColor }}>
                                        {Math.round(successRate * 100)}점
                                    </div>
                                </div>
                                <div className="score-feedback">
                                    <span className="feedback-emoji">{feedback.emoji}</span>
                                    <span className="feedback-text">{feedback.text}</span>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="result-stats">
                                <div className="stat-card">
                                    <span className="stat-label">은퇴 성공 확률</span>
                                    <span className="stat-value" style={{ color: scoreColor }}>
                                        {(successRate * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">예상 은퇴 자산 (중위값)</span>
                                    <span className="stat-value">
                                        {Math.round(endAsset / 100000000).toLocaleString()}억원
                                    </span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">은퇴까지 남은 기간</span>
                                    <span className="stat-value">{yearsToRetire}년</span>
                                </div>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="result-tips">
                            <h4>💡 은퇴 준비 개선 팁</h4>
                            <ul>
                                {successRate < 0.9 && (
                                    <li>월 저축액을 <strong>{Math.round(input.general.monthly_contribution / 10000 * 1.2).toLocaleString()}만원</strong>으로 늘리면 성공률이 올라가요</li>
                                )}
                                {input.retire_age < 65 && (
                                    <li>은퇴 시기를 1~2년 늦추면 더 안정적인 은퇴가 가능해요</li>
                                )}
                                <li>전문가 모드에서 포트폴리오를 조정하면 더 높은 수익을 기대할 수 있어요</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="wizard-nav">
                <button
                    className="btn btn-secondary"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
                >
                    ← 이전
                </button>
                <span className="wizard-nav-indicator">{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className="btn btn-primary" onClick={nextStep}>
                        다음 →
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={() => goToStep(0)}>
                        처음부터 다시 🔄
                    </button>
                )}
            </div>

            <style>{`
                .simple-dashboard-v2 {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: var(--space-lg);
                }

                /* Wizard Progress */
                .wizard-progress {
                    display: flex;
                    justify-content: center;
                    gap: var(--space-md);
                    margin-bottom: var(--space-lg);
                }
                .wizard-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-xs);
                    padding: var(--space-sm) var(--space-md);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: all var(--transition-base);
                }
                .wizard-step.active, .wizard-step.completed {
                    opacity: 1;
                }
                .wizard-step-icon {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    background: var(--bg-main);
                    border-radius: 50%;
                    border: 2px solid var(--border);
                    transition: all var(--transition-base);
                }
                .wizard-step.active .wizard-step-icon {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: white;
                }
                .wizard-step.completed .wizard-step-icon {
                    background: var(--success);
                    border-color: var(--success);
                    color: white;
                }
                .wizard-step-title {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-sub);
                }
                .wizard-step.active .wizard-step-title {
                    color: var(--primary);
                }

                /* Progress Bar */
                .wizard-progress-bar {
                    height: 4px;
                    background: var(--border);
                    border-radius: 9999px;
                    margin-bottom: var(--space-xl);
                    overflow: hidden;
                }
                .wizard-progress-fill {
                    height: 100%;
                    background: var(--gradient-primary);
                    border-radius: 9999px;
                    transition: width var(--transition-slow);
                }

                /* Wizard Content */
                .wizard-content {
                    min-height: 400px;
                }
                .wizard-panel {
                    background: var(--bg-card);
                    border-radius: var(--radius-xl);
                    padding: var(--space-2xl);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border-light);
                }
                .wizard-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 var(--space-sm) 0;
                    color: var(--text-main);
                }
                .wizard-desc {
                    color: var(--text-sub);
                    margin: 0 0 var(--space-xl) 0;
                }
                .wizard-form {
                    max-width: 500px;
                }

                /* Preset Cards */
                .preset-cards {
                    display: flex;
                    gap: var(--space-md);
                    margin-bottom: var(--space-xl);
                    flex-wrap: wrap;
                }
                .preset-card {
                    flex: 1;
                    min-width: 120px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-xs);
                    padding: var(--space-lg);
                    background: var(--bg-main);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .preset-card:hover {
                    border-color: var(--primary);
                    background: var(--primary-light);
                }
                .preset-icon {
                    font-size: 2rem;
                }
                .preset-label {
                    font-weight: 600;
                    color: var(--text-main);
                }
                .preset-value {
                    font-size: 0.8rem;
                    color: var(--text-sub);
                }

                /* Savings Summary */
                .savings-summary {
                    margin-top: var(--space-xl);
                    padding: var(--space-lg);
                    background: var(--bg-main);
                    border-radius: var(--radius);
                }
                .savings-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-sm) 0;
                }
                .savings-item:not(:last-child) {
                    border-bottom: 1px solid var(--border);
                }
                .savings-label {
                    color: var(--text-sub);
                }
                .savings-value {
                    font-weight: 700;
                    font-size: 1.1rem;
                }
                .savings-value.highlight {
                    color: var(--primary);
                }

                /* Result Grid */
                .result-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-xl);
                    margin-bottom: var(--space-xl);
                }
                @media (max-width: 600px) {
                    .result-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Score Card */
                .result-score-card {
                    text-align: center;
                }
                .gauge-container {
                    position: relative;
                }
                .gauge-score {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 2.5rem;
                    font-weight: 800;
                }
                .score-feedback {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-xs);
                }
                .feedback-emoji {
                    font-size: 2rem;
                }
                .feedback-text {
                    font-weight: 600;
                    color: var(--text-sub);
                }

                /* Stats */
                .result-stats {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .stat-card {
                    padding: var(--space-lg);
                    background: var(--bg-main);
                    border-radius: var(--radius);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-xs);
                }
                .stat-label {
                    font-size: 0.85rem;
                    color: var(--text-sub);
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                /* Tips */
                .result-tips {
                    padding: var(--space-lg);
                    background: var(--primary-light);
                    border-radius: var(--radius);
                    border-left: 4px solid var(--primary);
                }
                .result-tips h4 {
                    margin: 0 0 var(--space-sm) 0;
                    color: var(--primary);
                }
                .result-tips ul {
                    margin: 0;
                    padding-left: var(--space-lg);
                }
                .result-tips li {
                    margin-bottom: var(--space-xs);
                    color: var(--text-main);
                }

                /* Navigation */
                .wizard-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: var(--space-xl);
                    padding-top: var(--space-lg);
                    border-top: 1px solid var(--border);
                }
                .wizard-nav-indicator {
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
});
