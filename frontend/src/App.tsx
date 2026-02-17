import React, { Suspense, lazy, useMemo, useState, useEffect, useCallback } from "react";
import { useSimulation } from "./hooks/useSimulation";
import type { SimulationInput, ValidationWarning } from "./logic/types";
import { INITIAL_INPUT } from "./logic/constants";
import { validateSimulationInput } from "./logic/validation";
import { Onboarding } from "./components/Onboarding";
import { SimpleDashboard } from "./components/SimpleDashboard";
import type { AnalysisTabType, SidebarSectionId } from "./components/layout/types";

const ReportPrintView = lazy(() => import("./components/ReportPrintView").then((m) => ({ default: m.ReportPrintView })));
const Layout = lazy(() => import("./components/layout/Layout").then((m) => ({ default: m.Layout })));

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

    const validationWarnings = useMemo<ValidationWarning[]>(() => validateSimulationInput(input), [input]);
    const { runSimulation, isCalculating, result, error } = useSimulation();

    useEffect(() => {
        const timer = setTimeout(() => {
            void runSimulation(input, { detailLevel: "full", includeSampleTimelines: true }).catch((runError) =>
                console.error("Simulation failed:", runError)
            );
        }, 400);
        return () => clearTimeout(timer);
    }, [input, runSimulation]);

    const handlePrint = useCallback(() => {
        setShowPrintView(true);
        setTimeout(() => {
            window.print();
        }, 0);
    }, []);

    return (
        <div className="app-container">
            <header className="header">
                <div className="header-left">
                    <div className="brand">
                        <span>🏦</span> 은퇴 자산 시뮬레이터 Pro
                    </div>
                    {isCalculating && <span className="status-running animate-pulse">계산 중...</span>}
                </div>

                <div className="header-right">
                    <div className="view-toggle" role="tablist" aria-label="모드 전환">
                        <button
                            type="button"
                            className={viewMode === "simple" ? "active" : ""}
                            onClick={() => setViewMode("simple")}
                            aria-pressed={viewMode === "simple"}
                        >
                            🧭 간편 모드
                        </button>
                        <button
                            type="button"
                            className={viewMode === "pro" ? "active" : ""}
                            onClick={() => setViewMode("pro")}
                            aria-pressed={viewMode === "pro"}
                        >
                            🧠 전문가 모드
                        </button>
                    </div>
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
                        aria-label={theme === "light" ? "다크 모드 켜기" : "라이트 모드 켜기"}
                        title={theme === "light" ? "다크 모드 켜기" : "라이트 모드 켜기"}
                    >
                        {theme === "light" ? "🌙" : "☀️"}
                    </button>
                </div>
            </header>

            {error && (
                <div className="alert alert-danger app-alert" role="alert">
                    ⚠️ 시뮬레이션 실행 중 오류가 발생했습니다: {error}
                </div>
            )}

            {viewMode === "simple" ? (
                <div className="simple-mode-container">
                    <SimpleDashboard input={input} result={result} onInputChange={setInput} />
                </div>
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

            <Onboarding />

            {showPrintView && result && (
                <Suspense fallback={null}>
                    <ReportPrintView input={input} result={result} />
                </Suspense>
            )}
        </div>
    );
}

