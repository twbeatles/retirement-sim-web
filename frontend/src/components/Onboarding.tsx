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
            <div
                className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-300"
                onClick={completeOnboarding}
            />
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl w-[90%] min-w-[300px] sm:min-w-[360px] max-w-md shrink-0 rounded-3xl p-6 sm:p-8 shadow-2xl z-50 animate-in zoom-in-95 duration-300 border border-slate-200/50 dark:border-zinc-700/50"
                role="dialog"
                aria-modal="true"
                aria-label="온보딩 안내"
            >
                <div className="flex justify-center gap-2 mb-8">
                    {STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentStep ? "w-6 bg-blue-600 dark:bg-blue-500" :
                                index < currentStep ? "w-2 bg-blue-200 dark:bg-blue-900/50" : "w-2 bg-slate-200 dark:bg-zinc-700"
                                }`}
                        />
                    ))}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">{step.title}</h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed min-h-[4rem]">{step.description}</p>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                    <button
                        type="button"
                        onClick={completeOnboarding}
                        className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer w-full sm:w-auto text-center"
                    >
                        건너뛰기
                    </button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-500/50 cursor-pointer whitespace-nowrap"
                            >
                                ← 이전
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={nextStep}
                            className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer whitespace-nowrap"
                        >
                            {currentStep < STEPS.length - 1 ? "다음 →" : "시작하기! 🚀"}
                        </button>
                    </div>
                </div>

                <div className="absolute top-4 right-5 text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                    {currentStep + 1} / {STEPS.length}
                </div>
            </div>
        </>
    );
}

export function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
}

