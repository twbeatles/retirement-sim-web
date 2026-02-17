import React, { useState, useEffect } from "react";

const ONBOARDING_KEY = "retirement_sim_onboarding_v1";

interface OnboardingStep {
    title: string;
    description: string;
}

const STEPS: OnboardingStep[] = [
    {
        title: "👋 은퇴 시뮬레이터에 오신 것을 환영합니다!",
        description: "이 앱은 몬테카를로 시뮬레이션을 사용하여 은퇴 시 자산이 충분한지 분석합니다."
    },
    {
        title: "📝 기본 정보 입력",
        description: "현재 나이, 은퇴 목표 나이, 종료 나이를 설정합니다. 종료 나이까지 자산이 유지되는지 분석합니다."
    },
    {
        title: "💰 자산 및 포트폴리오",
        description: "현재 보유 자산과 월 저축액을 입력하세요. 포트폴리오 설정에서 주식/채권 비율을 조정할 수 있습니다."
    },
    {
        title: "📊 시뮬레이션 결과",
        description: "결과 화면에서 성공 확률과 자산 추이 차트를 확인합니다. 성공 확률이 80% 이상이면 안정적입니다."
    },
    {
        title: "💾 시나리오 저장",
        description: "현재 설정을 저장해두고 나중에 다시 불러올 수 있습니다. JSON 파일로 내보내기도 가능합니다."
    },
    {
        title: "🎉 시작하기",
        description: "이제 시작해보세요! 입력값을 변경하면 자동으로 시뮬레이션이 실행됩니다."
    }
];

interface Props {
    onComplete?: () => void;
}

export function Onboarding({ onComplete }: Props) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasSeenOnboarding) {
            setIsVisible(true);
        }
    }, []);

    const completeOnboarding = () => {
        localStorage.setItem(
            ONBOARDING_KEY,
            JSON.stringify({
                completedAt: new Date().toISOString(),
                version: 1
            })
        );
        setIsVisible(false);
        onComplete?.();
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            completeOnboarding();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    if (!isVisible) return null;

    const step = STEPS[currentStep];

    return (
        <>
            <div className="onboarding-overlay" />
            <div className="onboarding-modal" role="dialog" aria-modal="true" aria-label="온보딩 안내">
                <div className="onboarding-dots">
                    {STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`onboarding-dot ${index === currentStep ? "active" : ""} ${
                                index < currentStep ? "done" : ""
                            }`}
                        />
                    ))}
                </div>

                <h2 className="onboarding-title">{step.title}</h2>
                <p className="onboarding-description">{step.description}</p>

                <div className="onboarding-actions">
                    <button type="button" onClick={completeOnboarding} className="btn btn-ghost">
                        건너뛰기
                    </button>
                    <div className="onboarding-nav">
                        {currentStep > 0 && (
                            <button type="button" onClick={prevStep} className="btn btn-secondary">
                                ← 이전
                            </button>
                        )}
                        <button type="button" onClick={nextStep} className="btn btn-primary">
                            {currentStep < STEPS.length - 1 ? "다음 →" : "시작하기! 🚀"}
                        </button>
                    </div>
                </div>

                <div className="onboarding-counter">
                    {currentStep + 1} / {STEPS.length}
                </div>
            </div>
        </>
    );
}

export function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
}

