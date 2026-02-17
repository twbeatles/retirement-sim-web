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

interface DesktopLayoutProps extends LayoutSharedProps {}

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
            <aside className="sidebar">
                <div className="sidebar-tabs">
                    {SIDEBAR_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`sidebar-tab ${sidebarTab === tab.id ? "active" : ""}`}
                            onClick={() => setSidebarTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <ScenarioManager currentInput={input} onLoad={setInput} />

                <div className="sidebar-content animate-fadeIn">
                    {sidebarTab === "basic" && <BasicSection input={input} setInput={setInput} />}
                    {sidebarTab === "assets" && <AssetsSection input={input} setInput={setInput} />}
                    {sidebarTab === "pension" && <PensionSection input={input} setInput={setInput} />}
                    {sidebarTab === "goal" && <GoalSection input={input} setInput={setInput} />}
                    {sidebarTab === "advanced" && <AdvancedSection input={input} setInput={setInput} />}
                </div>

                {validationWarnings.length > 0 && (
                    <div className="validation-warnings">
                        <h4 className="warning-header">⚠️ 입력값 확인</h4>
                        {validationWarnings.map((warning, index) => (
                            <div key={index} className={`warning-item ${warning.severity}`}>
                                {warning.message}
                            </div>
                        ))}
                    </div>
                )}
            </aside>

            <main className="main-content">
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

