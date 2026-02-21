import React, { useMemo, useState, useEffect } from "react";
import { ScenarioManager } from "../ScenarioManager";
import { SIDEBAR_TABS } from "../../logic/uiConstants";
import { BasicSection } from "./sections/BasicSection";
import { AssetsSection } from "./sections/AssetsSection";
import { PensionSection } from "./sections/PensionSection";
import { GoalSection } from "./sections/GoalSection";
import { AdvancedSection } from "./sections/AdvancedSection";
import { ResultsSection } from "./sections/ResultsSection";
import type { LayoutSectionId, LayoutSharedProps } from "./types";

interface MobileLayoutProps extends LayoutSharedProps { }

export function MobileLayout({
    input,
    setInput,
    result,
    validationWarnings,
    sidebarTab,
    setSidebarTab,
    analysisTab,
    setAnalysisTab,
    onPrint
}: MobileLayoutProps) {
    const [activeTab, setActiveTab] = useState<LayoutSectionId>(sidebarTab ?? "basic");
    useEffect(() => {
        if (activeTab !== "results") {
            setActiveTab(sidebarTab);
        }
    }, [sidebarTab, activeTab]);

    const isInputTab = useMemo(() => activeTab !== "results", [activeTab]);

    const handleTabChange = (tabId: LayoutSectionId) => {
        setActiveTab(tabId);
        if (tabId !== "results") {
            setSidebarTab(tabId);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-var(--spacing-header))] relative overflow-hidden">
            <div className="flex-[1_1_auto] overflow-y-auto pb-[calc(70px+env(safe-area-inset-bottom))] scroll-smooth">
                {isInputTab && (
                    <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-zinc-800/50 sticky top-0 z-10 shadow-sm">
                        <ScenarioManager currentInput={input} onLoad={setInput} />
                    </div>
                )}

                <div className="p-4 animate-in fade-in duration-300 relative">
                    {activeTab === "basic" && <BasicSection input={input} setInput={setInput} />}
                    {activeTab === "assets" && <AssetsSection input={input} setInput={setInput} />}
                    {activeTab === "pension" && <PensionSection input={input} setInput={setInput} />}
                    {activeTab === "goal" && <GoalSection input={input} setInput={setInput} />}
                    {activeTab === "advanced" && <AdvancedSection input={input} setInput={setInput} />}
                    {activeTab === "results" && (
                        <ResultsSection
                            input={input}
                            setInput={setInput}
                            result={result}
                            analysisTab={analysisTab}
                            setAnalysisTab={setAnalysisTab}
                            onPrint={onPrint}
                            compact
                        />
                    )}
                </div>

                {isInputTab && validationWarnings.length > 0 && (
                    <div className="m-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30">
                        <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2">⚠️ 입력값 확인</h4>
                        <div className="flex flex-col gap-2">
                            {validationWarnings.map((warning, index) => (
                                <div key={index} className={`text-xs p-2 rounded-lg border ${warning.severity === 'error' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400' : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-400'}`}>
                                    {warning.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="h-6" />
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-white/75 dark:bg-zinc-900/80 backdrop-blur-2xl border-t border-slate-200/60 dark:border-zinc-800/60 flex justify-around items-center h-[72px] pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 px-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]" aria-label="하단 탐색">
                {SIDEBAR_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full border-none bg-transparent transition-all duration-300 cursor-pointer ${activeTab === tab.id ? "text-blue-600 dark:text-blue-400 -translate-y-1" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        <span className={`text-2xl transition-all duration-300 ${activeTab === tab.id ? "scale-110 drop-shadow-md" : "grayscale-[50%] opacity-80"}`}>{tab.icon}</span>
                        <span className={`text-[10px] font-bold ${activeTab === tab.id ? "opacity-100" : "opacity-70 font-semibold"}`}>{tab.label}</span>
                    </button>
                ))}
                <button
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full border-none bg-transparent transition-all duration-300 cursor-pointer ${activeTab === "results" ? "text-blue-600 dark:text-blue-400 -translate-y-1" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                    onClick={() => handleTabChange("results")}
                >
                    <span className={`text-2xl transition-all duration-300 ${activeTab === "results" ? "scale-110 drop-shadow-md" : "grayscale-[50%] opacity-80"}`}>📊</span>
                    <span className={`text-[10px] font-bold ${activeTab === "results" ? "opacity-100" : "opacity-70 font-semibold"}`}>리포트</span>
                </button>
            </nav>
        </div>
    );
}
