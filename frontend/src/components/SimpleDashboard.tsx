import React, { useState } from "react";
import type { SimulationInput, SimulationResult } from "../logic/types";
import { InputSlider } from "./ui/InputSlider";

interface SimpleDashboardProps {
    input: SimulationInput;
    result: SimulationResult | null;
    onInputChange: (input: SimulationInput) => void;
}

const STEPS = [
    { id: "basic", title: "기본 정보", icon: "📋", description: "나이와 은퇴 목표를 설정하세요" },
    { id: "assets", title: "자산 현황", icon: "💰", description: "현재 보유 자산을 입력하세요" },
    { id: "savings", title: "저축 계획", icon: "🏦", description: "월 저축 금액을 설정하세요" },
    { id: "result", title: "결과 확인", icon: "📊", description: "은퇴 준비도를 확인하세요" }
];

const PRESETS = [
    { id: "worker", label: "직장인", icon: "👔", savings: 1000000, asset: 50000000 },
    { id: "public", label: "공무원", icon: "🏛️", savings: 800000, asset: 30000000 },
    { id: "self", label: "자영업자", icon: "🏪", savings: 1500000, asset: 80000000 }
];

function getScoreClass(rate: number) {
    if (rate >= 0.9) return "score-excellent";
    if (rate >= 0.7) return "score-good";
    if (rate >= 0.5) return "score-caution";
    return "score-danger";
}

function getGaugeColor(rate: number) {
    if (rate >= 0.9) return "var(--success)";
    if (rate >= 0.7) return "#22c55e";
    if (rate >= 0.5) return "var(--warning)";
    return "var(--danger)";
}

function getFeedback(rate: number) {
    if (rate >= 0.9) return { emoji: "🎉", text: "아주 훌륭합니다! 은퇴 준비가 잘 되어 있어요." };
    if (rate >= 0.7) return { emoji: "😊", text: "양호합니다. 조금만 더 저축하면 완벽해요!" };
    if (rate >= 0.5) return { emoji: "🤔", text: "주의가 필요합니다. 저축액을 늘려보세요." };
    return { emoji: "⚠️", text: "대책이 필요합니다. 은퇴 계획을 점검하세요." };
}

export const SimpleDashboard = React.memo(function SimpleDashboard({ input, result, onInputChange }: SimpleDashboardProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const successRate = result?.summary.successRate ?? 0;
    const endAsset = result?.summary.mc?.totalAssetsReal.p50 ?? 0;
    const currentAsset = input.general.current_balance + input.private_pension.current_balance;
    const yearsToRetire = Math.max(0, input.retire_age - input.current_age);
    const scoreClass = getScoreClass(successRate);
    const clampedSuccessRate = Math.max(0, Math.min(1, successRate));
    const gaugeColor = getGaugeColor(clampedSuccessRate);
    const gaugeRadius = 70;
    const gaugeLength = Math.PI * gaugeRadius;
    const gaugeOffset = gaugeLength * (1 - clampedSuccessRate);
    const feedback = getFeedback(successRate);

    const handlePreset = (preset: (typeof PRESETS)[0]) => {
        onInputChange({
            ...input,
            general: {
                ...input.general,
                current_balance: preset.asset,
                monthly_contribution: preset.savings
            }
        });
    };

    return (
        <div className="simple-dashboard-v2">
            <div className="wizard-progress">
                {STEPS.map((step, index) => (
                    <button
                        key={step.id}
                        className={`wizard-step ${index === currentStep ? "active" : ""} ${index < currentStep ? "completed" : ""}`}
                        onClick={() => setCurrentStep(index)}
                    >
                        <span className="wizard-step-icon">{index < currentStep ? "✓" : step.icon}</span>
                        <span className="wizard-step-title">{step.title}</span>
                    </button>
                ))}
            </div>

            <div className="wizard-progress-bar">
                <div className={`wizard-progress-fill step-${currentStep + 1}`} />
            </div>

            <div className="wizard-content">
                {currentStep === 0 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">
                            {STEPS[0].icon} {STEPS[0].title}
                        </h2>
                        <p className="wizard-desc">{STEPS[0].description}</p>
                        <div className="wizard-form">
                            <InputSlider
                                label="현재 나이"
                                value={input.current_age}
                                onChange={(value) => onInputChange({ ...input, current_age: value })}
                                min={20}
                                max={70}
                                unit="세"
                                hint="💡 정확한 나이를 입력하면 더 정확한 계산이 가능해요"
                            />
                            <InputSlider
                                label="은퇴 목표 나이"
                                value={input.retire_age}
                                onChange={(value) => onInputChange({ ...input, retire_age: value })}
                                min={Math.max(input.current_age + 1, 40)}
                                max={80}
                                unit="세"
                                hint={`지금부터 ${yearsToRetire}년 후 은퇴 예정`}
                            />
                            <InputSlider
                                label="기대 수명"
                                value={input.end_age}
                                onChange={(value) => onInputChange({ ...input, end_age: value })}
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
                        <h2 className="wizard-title">
                            {STEPS[1].icon} {STEPS[1].title}
                        </h2>
                        <p className="wizard-desc">{STEPS[1].description}</p>
                        <div className="preset-cards">
                            {PRESETS.map((preset) => (
                                <button key={preset.id} className="preset-card" onClick={() => handlePreset(preset)}>
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
                                onChange={(value) =>
                                    onInputChange({
                                        ...input,
                                        general: { ...input.general, current_balance: value * 10000 }
                                    })
                                }
                                min={0}
                                max={100000}
                                step={100}
                                unit="만원"
                                formatValue={(value) => value.toLocaleString()}
                                hint="💡 예금, 주식, 연금저축 등 모든 금융자산 합계"
                            />
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">
                            {STEPS[2].icon} {STEPS[2].title}
                        </h2>
                        <p className="wizard-desc">{STEPS[2].description}</p>

                        <div className="wizard-form">
                            <InputSlider
                                label="매월 저축 가능액"
                                value={Math.round(input.general.monthly_contribution / 10000)}
                                onChange={(value) =>
                                    onInputChange({
                                        ...input,
                                        general: { ...input.general, monthly_contribution: value * 10000 }
                                    })
                                }
                                min={0}
                                max={1000}
                                step={10}
                                unit="만원"
                                formatValue={(value) => value.toLocaleString()}
                                hint={`연간 저축액: ${((input.general.monthly_contribution * 12) / 10000).toLocaleString()}만원`}
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
                                        {Math.round((currentAsset + input.general.monthly_contribution * 12 * yearsToRetire) / 100000000).toLocaleString()}
                                        억원
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="wizard-panel animate-fadeIn">
                        <h2 className="wizard-title">📊 은퇴 준비도 분석 결과</h2>

                        <div className="result-grid">
                            <div className="result-score-card">
                                <div className="gauge-container">
                                    <svg width="100%" height="180" viewBox="0 0 180 110" role="img" aria-label="은퇴 성공 확률 게이지">
                                        <path
                                            d="M20 90 A70 70 0 0 1 160 90"
                                            fill="none"
                                            stroke="var(--border)"
                                            strokeWidth="18"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M20 90 A70 70 0 0 1 160 90"
                                            fill="none"
                                            stroke={gaugeColor}
                                            strokeWidth="18"
                                            strokeLinecap="round"
                                            strokeDasharray={`${gaugeLength} ${gaugeLength}`}
                                            strokeDashoffset={gaugeOffset}
                                        />
                                    </svg>
                                    <div className={`gauge-score ${scoreClass}`}>{Math.round(successRate * 100)}점</div>
                                </div>
                                <div className="score-feedback">
                                    <span className="feedback-emoji">{feedback.emoji}</span>
                                    <span className="feedback-text">{feedback.text}</span>
                                </div>
                            </div>

                            <div className="result-stats">
                                <div className="stat-card">
                                    <span className="stat-label">은퇴 성공 확률</span>
                                    <span className={`stat-value ${scoreClass}`}>{(successRate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">예상 은퇴 자산 (중위값)</span>
                                    <span className="stat-value">{Math.round(endAsset / 100000000).toLocaleString()}억원</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">은퇴까지 남은 기간</span>
                                    <span className="stat-value">{yearsToRetire}년</span>
                                </div>
                            </div>
                        </div>

                        <div className="result-tips">
                            <h4>💡 은퇴 준비 개선 팁</h4>
                            <ul>
                                {successRate < 0.9 && (
                                    <li>
                                        월 저축액을 <strong>{Math.round((input.general.monthly_contribution / 10000) * 1.2).toLocaleString()}만원</strong>
                                        으로 늘리면 성공률이 올라가요
                                    </li>
                                )}
                                {input.retire_age < 65 && <li>은퇴 시기를 1~2년 늦추면 더 안정적인 은퇴가 가능해요</li>}
                                <li>전문가 모드에서 포트폴리오를 조정하면 더 높은 수익을 기대할 수 있어요</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="wizard-nav">
                <button
                    className={`btn btn-secondary ${currentStep === 0 ? "is-hidden" : ""}`}
                    onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                >
                    ← 이전
                </button>
                <span className="wizard-nav-indicator">
                    {currentStep + 1} / {STEPS.length}
                </span>
                {currentStep < STEPS.length - 1 ? (
                    <button className="btn btn-primary" onClick={() => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))}>
                        다음 →
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={() => setCurrentStep(0)}>
                        처음부터 다시 🔄
                    </button>
                )}
            </div>
        </div>
    );
});
