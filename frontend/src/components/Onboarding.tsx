/**
 * Onboarding Component
 * Step-by-step tutorial for first-time users
 */
import React, { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'retirement_sim_onboarding_v1';

interface OnboardingStep {
    title: string;
    description: string;
    highlight?: string; // CSS selector to highlight
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: OnboardingStep[] = [
    {
        title: '👋 은퇴 시뮬레이터에 오신 것을 환영합니다!',
        description: '이 앱은 몬테카를로 시뮬레이션을 사용하여 은퇴 시 자산이 충분한지 분석합니다.',
        position: 'center'
    },
    {
        title: '📝 기본 정보 입력',
        description: '현재 나이, 은퇴 목표 나이, 종료 나이를 설정합니다. 종료 나이까지 자산이 유지되는지 분석합니다.',
        position: 'right'
    },
    {
        title: '💰 자산 및 포트폴리오',
        description: '현재 보유 자산과 월 저축액을 입력하세요. 포트폴리오 설정에서 주식/채권 비율을 조정할 수 있습니다.',
        position: 'right'
    },
    {
        title: '📊 시뮬레이션 결과',
        description: '우측에서 성공 확률과 자산 추이 차트를 확인합니다. 성공 확률이 80% 이상이면 안정적입니다.',
        position: 'left'
    },
    {
        title: '💾 시나리오 저장',
        description: '현재 설정을 저장해두고 나중에 다시 불러올 수 있습니다. JSON 파일로 내보내기도 가능합니다.',
        position: 'right'
    },
    {
        title: '🎉 시작하기',
        description: '이제 시작해보세요! 입력값을 변경하면 자동으로 시뮬레이션이 실행됩니다.',
        position: 'center'
    }
];

interface Props {
    onComplete?: () => void;
}

export function Onboarding({ onComplete }: Props) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Check if user has seen onboarding
    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasSeenOnboarding) {
            setIsVisible(true);
        }
    }, []);

    // Save progress
    const completeOnboarding = () => {
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
            completedAt: new Date().toISOString(),
            version: 1
        }));
        setIsVisible(false);
        onComplete?.();
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeOnboarding();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const skip = () => {
        completeOnboarding();
    };

    if (!isVisible) return null;

    const step = STEPS[currentStep];

    return (
        <>
            {/* Overlay */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                zIndex: 9998
            }} />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                maxWidth: 480,
                width: '90%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                zIndex: 9999
            }}>
                {/* Progress Dots */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 24
                }}>
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: i === currentStep ? 'var(--primary)' :
                                    i < currentStep ? 'var(--success)' : 'var(--border)',
                                transition: 'background 0.3s'
                            }}
                        />
                    ))}
                </div>

                {/* Content */}
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginBottom: 16,
                    textAlign: 'center'
                }}>
                    {step.title}
                </h2>
                <p style={{
                    color: 'var(--text-sub)',
                    lineHeight: 1.6,
                    textAlign: 'center',
                    marginBottom: 32
                }}>
                    {step.description}
                </p>

                {/* Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={skip}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-sub)',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        건너뛰기
                    </button>

                    <div style={{ display: 'flex', gap: 12 }}>
                        {currentStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="btn btn-secondary"
                            >
                                ← 이전
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="btn btn-primary"
                        >
                            {currentStep < STEPS.length - 1 ? '다음 →' : '시작하기! 🚀'}
                        </button>
                    </div>
                </div>

                {/* Step Counter */}
                <div style={{
                    textAlign: 'center',
                    marginTop: 20,
                    color: 'var(--text-sub)',
                    fontSize: '0.8rem'
                }}>
                    {currentStep + 1} / {STEPS.length}
                </div>
            </div>
        </>
    );
}

/**
 * Reset onboarding (for testing)
 */
export function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
}
