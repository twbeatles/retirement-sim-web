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
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 lg:p-10 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-center mb-10 relative">
                {STEPS.map((step, index) => (
                    <button
                        key={step.id}
                        className={`flex flex-col items-center gap-3 z-10 transition-all cursor-pointer group flex-1 ${index === currentStep ? "text-blue-600 dark:text-blue-400" : index < currentStep ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                        onClick={() => setCurrentStep(index)}
                    >
                        <span className={`w-12 h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl transition-all shadow-sm group-hover:scale-110 ${index === currentStep ? "bg-blue-600 text-white shadow-blue-500/30" : index < currentStep ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700"}`}>
                            {index < currentStep ? "✓" : step.icon}
                        </span>
                        <span className="text-xs sm:text-sm font-bold tracking-tight">{step.title}</span>
                    </button>
                ))}
                {/* Progress bar background line */}
                <div className="absolute top-6 left-[12.5%] right-[12.5%] h-1 bg-slate-100 dark:bg-zinc-800 -z-0" />
            </div>

            <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full mb-10 overflow-hidden">
                <div
                    className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
            </div>

            <div className="min-h-[400px]">
                {currentStep === 0 && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-500 flex flex-col gap-8">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-3">
                                <span className="text-3xl lg:text-4xl">{STEPS[0].icon}</span> {STEPS[0].title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base">{STEPS[0].description}</p>
                        </div>
                        <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
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
                    <div className="animate-in slide-in-from-right-4 fade-in duration-500 flex flex-col gap-8">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-3">
                                <span className="text-3xl lg:text-4xl">{STEPS[1].icon}</span> {STEPS[1].title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base">{STEPS[1].description}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto w-full mb-4">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group active:scale-[0.98]"
                                    onClick={() => handlePreset(preset)}
                                >
                                    <span className="text-4xl transition-transform group-hover:scale-110">{preset.icon}</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{preset.label}</span>
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{(preset.asset / 10000).toLocaleString()}만원</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
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
                    <div className="animate-in slide-in-from-right-4 fade-in duration-500 flex flex-col gap-8">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-3">
                                <span className="text-3xl lg:text-4xl">{STEPS[2].icon}</span> {STEPS[2].title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base">{STEPS[2].description}</p>
                        </div>

                        <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
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

                            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-6 justify-between items-center mt-4">
                                <div className="flex flex-col items-center sm:items-start w-full sm:w-auto">
                                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">은퇴까지 예상 저축 합계</span>
                                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                        {Math.round((input.general.monthly_contribution * 12 * yearsToRetire) / 100000000).toLocaleString()}억원
                                    </span>
                                </div>
                                <div className="hidden sm:block w-px h-12 bg-slate-200 dark:bg-zinc-700" />
                                <div className="w-full sm:hidden h-px bg-slate-200 dark:bg-zinc-700 my-2" />
                                <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">현재 자산 + 저축</span>
                                    <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                                        {Math.round((currentAsset + input.general.monthly_contribution * 12 * yearsToRetire) / 100000000).toLocaleString()}
                                        억원
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-500 flex flex-col gap-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">📊 은퇴 준비도 분석 결과</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto w-full">
                            <div className="bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-400 to-purple-500" />
                                <div className="relative w-full max-w-[240px] aspect-[2/1] flex flex-col items-center mx-auto mb-6">
                                    <svg width="100%" height="100%" viewBox="0 0 180 110" role="img" aria-label="은퇴 성공 확률 게이지" className="drop-shadow-sm">
                                        <path
                                            d="M20 90 A70 70 0 0 1 160 90"
                                            fill="none"
                                            stroke="var(--color-slate-100)"
                                            strokeWidth="18"
                                            strokeLinecap="round"
                                            className="dark:stroke-zinc-800"
                                        />
                                        <path
                                            d="M20 90 A70 70 0 0 1 160 90"
                                            fill="none"
                                            stroke={gaugeColor}
                                            strokeWidth="18"
                                            strokeLinecap="round"
                                            strokeDasharray={`${gaugeLength} ${gaugeLength}`}
                                            strokeDashoffset={gaugeOffset}
                                            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                        />
                                    </svg>
                                    <div className="absolute bottom-2 left-0 right-0 text-center">
                                        <div className="text-5xl font-black tabular-nums tracking-tighter" style={{ color: gaugeColor }}>
                                            {Math.round(successRate * 100)}<span className="text-2xl ml-1 opacity-80">점</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/80 px-4 py-3 rounded-2xl flex items-center gap-3 w-full justify-center">
                                    <span className="text-2xl">{feedback.emoji}</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center leading-snug">{feedback.text}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">은퇴 성공 확률</span>
                                    <span className="text-xl font-bold" style={{ color: gaugeColor }}>{(successRate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">예상 은퇴 자산 (중위값)</span>
                                    <span className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(endAsset / 100000000).toLocaleString()}억원</span>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">은퇴까지 남은 기간</span>
                                    <span className="text-xl font-bold text-slate-900 dark:text-white">{yearsToRetire}년</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 lg:p-8 max-w-4xl mx-auto w-full mt-2">
                            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">💡 은퇴 준비 개선 팁</h4>
                            <ul className="space-y-3 m-0 pl-1 list-none">
                                {successRate < 0.9 && (
                                    <li className="flex gap-3 text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed before:content-['✓'] before:text-blue-500 before:font-bold">
                                        <span>월 저축액을 <strong className="text-blue-600 dark:text-blue-400 font-bold">{Math.round((input.general.monthly_contribution / 10000) * 1.2).toLocaleString()}만원</strong>으로 늘리면 성공률이 올라가요</span>
                                    </li>
                                )}
                                {input.retire_age < 65 && <li className="flex gap-3 text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed before:content-['✓'] before:text-blue-500 before:font-bold">
                                    <span>은퇴 시기를 1~2년 늦추면 더 안정적인 은퇴가 가능해요</span>
                                </li>}
                                <li className="flex gap-3 text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed before:content-['✓'] before:text-blue-500 before:font-bold">
                                    <span>전문가 모드에서 포트폴리오를 조정하면 더 높은 수익을 기대할 수 있어요</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-12 pt-6 border-t border-slate-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                <button
                    className={`px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors w-full sm:w-auto shadow-sm cursor-pointer ${currentStep === 0 ? "invisible" : ""}`}
                    onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                >
                    ← 이전
                </button>
                <div className="flex gap-2">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-blue-600 scale-125' : i < currentStep ? 'bg-blue-300 dark:bg-blue-800' : 'bg-slate-200 dark:bg-zinc-700'}`} />
                    ))}
                </div>
                {currentStep < STEPS.length - 1 ? (
                    <button className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all hover:-translate-y-0.5 shadow-md shadow-blue-500/20 active:scale-95 w-full sm:w-auto cursor-pointer" onClick={() => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))}>
                        다음 단계 →
                    </button>
                ) : (
                    <button className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold transition-all hover:-translate-y-0.5 shadow-md active:scale-95 w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2" onClick={() => setCurrentStep(0)}>
                        처음부터 다시 🔄
                    </button>
                )}
            </div>
        </div>
    );
});
