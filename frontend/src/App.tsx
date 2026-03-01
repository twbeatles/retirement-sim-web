import React, { Suspense, lazy, useMemo, useState, useEffect, useCallback } from "react";
import { useSimulation } from "./hooks/useSimulation";
import { useAutoSimulation } from "./hooks/useAutoSimulation";
import type { SimulationInput, ValidationWarning } from "./logic/types";
import { INITIAL_INPUT } from "./logic/constants";
import { validateSimulationInput } from "./logic/validation";
const Onboarding = lazy(() => import("./components/Onboarding").then((m) => ({ default: m.Onboarding })));
import type { AnalysisTabType, SidebarSectionId } from "./components/layout/types";

const ReportPrintView = lazy(() => import("./components/ReportPrintView").then((m) => ({ default: m.ReportPrintView })));
const Layout = lazy(() => import("./components/layout/Layout").then((m) => ({ default: m.Layout })));
const SimpleDashboard = lazy(() => import("./components/SimpleDashboard").then((m) => ({ default: m.SimpleDashboard })));

export default function App() {
    const [input, setInput] = useState<SimulationInput>(INITIAL_INPUT);
    const [analysisTab, setAnalysisTab] = useState<AnalysisTabType>("risk");
    const [viewMode, setViewMode] = useState<"simple" | "pro">("simple");
    const [sidebarTab, setSidebarTab] = useState<SidebarSectionId>("basic");
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [showPrintView, setShowPrintView] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    useEffect(() => {
        const handleAfterPrint = () => setShowPrintView(false);
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    const prefetchProModules = useCallback(() => {
        void Promise.allSettled([
            import("./components/layout/Layout"),
            import("./components/RiskDashboard"),
            import("./components/ScenarioComparison"),
            import("./components/WhatIfSlider"),
            import("./components/Charts/SurvivalChart"),
            import("./components/Charts/AssetBreakdownChart"),
            import("./components/Charts/CashflowStackChart"),
            import("./components/Charts/FanChart"),
            import("./components/YearlyReportTable")
        ]);
    }, []);

    useEffect(() => {
        if (viewMode !== "simple") {
            return;
        }

        const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        let timeoutId: number | null = null;
        let idleId: number | null = null;

        if (idleWindow.requestIdleCallback) {
            idleId = idleWindow.requestIdleCallback(() => {
                prefetchProModules();
            }, { timeout: 1500 });
        } else {
            timeoutId = window.setTimeout(() => {
                prefetchProModules();
            }, 900);
        }

        return () => {
            if (idleId !== null && idleWindow.cancelIdleCallback) {
                idleWindow.cancelIdleCallback(idleId);
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [prefetchProModules, viewMode]);

    const validationWarnings = useMemo<ValidationWarning[]>(() => validateSimulationInput(input), [input]);
    const hasBlockingValidationError = useMemo(
        () => validationWarnings.some((warning) => warning.severity === "error"),
        [validationWarnings]
    );
    const { runSimulation, isCalculating, result, error } = useSimulation();
    useAutoSimulation({ input, viewMode, runSimulation, hasBlockingValidationError });

    const handlePrint = useCallback(() => {
        setShowPrintView(true);
        setTimeout(() => {
            window.print();
        }, 0);
    }, []);
    const resultStatusLabel = result?.detailLevel === "preview" ? "빠른 추정값" : result ? "최종 결과" : null;

    return (
        <div className="flex flex-col min-h-screen w-full p-4 lg:p-6 lg:grid lg:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] gap-4 lg:gap-6 max-w-[var(--spacing-max-width)] mx-auto relative z-0">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-500">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-900/20 blur-[100px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-400/10 dark:bg-purple-900/20 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 dark:bg-emerald-900/10 blur-[120px]" />
            </div>

            <header className="col-span-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl px-4 lg:px-6 h-[var(--spacing-header)] rounded-2xl flex items-center justify-between shadow-sm border border-slate-200/50 dark:border-zinc-800/50 sticky top-4 lg:top-6 z-50 transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="text-lg lg:text-xl font-extrabold bg-gradient-to-br from-blue-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                        <span className="text-current">🏦</span> 은퇴 자산 시뮬레이터 Pro
                    </div>
                    {isCalculating && <span className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">계산 중...</span>}
                    {resultStatusLabel && <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{resultStatusLabel}</span>}
                </div>

                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="flex bg-slate-500/5 dark:bg-zinc-500/10 p-1 rounded-full border border-slate-200/50 dark:border-zinc-700/50 backdrop-blur-md" role="tablist" aria-label="모드 전환">
                        <button
                            type="button"
                            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full border-none bg-transparent text-sm font-semibold transition-all min-h-[36px] lg:min-h-[40px] cursor-pointer ${viewMode === "simple" ? "bg-white/90 dark:bg-zinc-800/90 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
                            onClick={() => setViewMode("simple")}
                            aria-pressed={viewMode === "simple"}
                        >
                            🧭 간편 모드
                        </button>
                        <button
                            type="button"
                            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full border-none bg-transparent text-sm font-semibold transition-all min-h-[36px] lg:min-h-[40px] cursor-pointer ${viewMode === "pro" ? "bg-white/90 dark:bg-zinc-800/90 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
                            onClick={() => setViewMode("pro")}
                            aria-pressed={viewMode === "pro"}
                        >
                            🧠 전문가 모드
                        </button>
                    </div>
                    <button
                        type="button"
                        className="w-10 h-10 rounded-full border border-slate-200/50 dark:border-zinc-700/50 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md flex items-center justify-center cursor-pointer text-lg hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm"
                        onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
                        aria-label={theme === "light" ? "다크 모드 켜기" : "라이트 모드 켜기"}
                        title={theme === "light" ? "다크 모드 켜기" : "라이트 모드 켜기"}
                    >
                        {theme === "light" ? "🌙" : "☀️"}
                    </button>
                </div>
            </header>

            {error && (
                <div className="col-span-full p-4 rounded-xl text-sm flex items-start gap-2 bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-900/30" role="alert">
                    ⚠️ 시뮬레이션 실행 중 오류가 발생했습니다: {error}
                </div>
            )}

            {viewMode === "simple" ? (
                <Suspense fallback={<div className="text-center text-slate-400 py-8 lg:col-span-full">대시보드 로딩 중...</div>}>
                    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full min-w-[320px] lg:col-span-full">
                        <SimpleDashboard input={input} result={result} onInputChange={setInput} />
                    </div>
                </Suspense>
            ) : (
                <Suspense fallback={<div className="text-center text-muted py-8">레이아웃 로딩 중...</div>}>
                    <Layout
                        input={input}
                        setInput={setInput}
                        result={result}
                        validationWarnings={validationWarnings}
                        sidebarTab={sidebarTab}
                        setSidebarTab={setSidebarTab}
                        analysisTab={analysisTab}
                        setAnalysisTab={setAnalysisTab}
                        onPrint={handlePrint}
                    />
                </Suspense>
            )}

            <Suspense fallback={null}>
                <Onboarding />
            </Suspense>

            {showPrintView && result && (
                <Suspense fallback={null}>
                    <ReportPrintView input={input} result={result} />
                </Suspense>
            )}
        </div>
    );
}
