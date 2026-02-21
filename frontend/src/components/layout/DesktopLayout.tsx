import React from "react";
import { ScenarioManager } from "../ScenarioManager";
import { SIDEBAR_TABS } from "../../logic/uiConstants";
import { BasicSection } from "./sections/BasicSection";
import { AssetsSection } from "./sections/AssetsSection";
import { PensionSection } from "./sections/PensionSection";
import { GoalSection } from "./sections/GoalSection";
import { AdvancedSection } from "./sections/AdvancedSection";
import { ResultsSection } from "./sections/ResultsSection";
import type { LayoutSharedProps } from "./types";

interface DesktopLayoutProps extends LayoutSharedProps { }

export function DesktopLayout({
    input,
    setInput,
    result,
    validationWarnings,
    sidebarTab,
    setSidebarTab,
    analysisTab,
    setAnalysisTab,
    onPrint
}: DesktopLayoutProps) {
    return (
        <>
            <aside className="h-[calc(100vh-var(--spacing-header)-var(--spacing-xl))] overflow-y-auto bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-zinc-800/50 p-4 lg:p-6 flex flex-col gap-6 sticky top-[calc(var(--spacing-header)+var(--spacing-xl))] hidden lg:flex">
                <div className="flex flex-col gap-1">
                    {SIDEBAR_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-none text-left text-sm font-semibold transition-all duration-300 cursor-pointer group hover:shadow-sm ${sidebarTab === tab.id ? "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 text-blue-700 dark:text-blue-300 shadow-inner ring-1 ring-blue-500/20" : "bg-transparent text-slate-500 hover:bg-white/80 dark:hover:bg-zinc-800/80 dark:text-slate-400"}`}
                            onClick={() => setSidebarTab(tab.id)}
                        >
                            <span className={`text-xl transition-all duration-300 group-hover:scale-110 ${sidebarTab === tab.id ? "opacity-100 text-blue-600 dark:text-blue-400 drop-shadow-sm" : "opacity-70 grayscale-[50%]"}`}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <ScenarioManager currentInput={input} onLoad={setInput} />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-300">
                    {sidebarTab === "basic" && <BasicSection input={input} setInput={setInput} />}
                    {sidebarTab === "assets" && <AssetsSection input={input} setInput={setInput} />}
                    {sidebarTab === "pension" && <PensionSection input={input} setInput={setInput} />}
                    {sidebarTab === "goal" && <GoalSection input={input} setInput={setInput} />}
                    {sidebarTab === "advanced" && <AdvancedSection input={input} setInput={setInput} />}
                </div>

                {validationWarnings.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30">
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
            </aside>

            <main className="min-h-[calc(100vh-var(--spacing-header)-var(--spacing-xl))]">
                <ResultsSection
                    input={input}
                    setInput={setInput}
                    result={result}
                    analysisTab={analysisTab}
                    setAnalysisTab={setAnalysisTab}
                    onPrint={onPrint}
                />
            </main>
        </>
    );
}

