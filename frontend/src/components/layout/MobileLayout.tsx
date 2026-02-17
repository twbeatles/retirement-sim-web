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

interface MobileLayoutProps extends LayoutSharedProps {}

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
        <div className="mobile-layout">
            <div className="mobile-content pb-safe">
                {isInputTab && (
                    <div className="mobile-scenario-wrap">
                        <ScenarioManager currentInput={input} onLoad={setInput} />
                    </div>
                )}

                <div className="mobile-section p-3 animate-fadeIn">
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
                    <div className="validation-warnings m-3">
                        <h4 className="warning-header">⚠️ 입력값 확인</h4>
                        {validationWarnings.map((warning, index) => (
                            <div key={index} className={`warning-item ${warning.severity}`}>
                                {warning.message}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mobile-bottom-spacer" />
            </div>

            <nav className="bottom-nav" aria-label="하단 탐색">
                {SIDEBAR_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        <span className="nav-icon">{tab.icon}</span>
                        <span className="nav-label">{tab.label}</span>
                    </button>
                ))}
                <button
                    className={`nav-item ${activeTab === "results" ? "active" : ""}`}
                    onClick={() => handleTabChange("results")}
                >
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">리포트</span>
                </button>
            </nav>
        </div>
    );
}
