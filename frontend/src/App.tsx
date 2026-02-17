import React, { Suspense, lazy, useMemo, useState, useEffect, useCallback } from "react";
import { useSimulation } from "./hooks/useSimulation";
import type { SimulationInput, ValidationWarning } from "./logic/types";
import { INITIAL_INPUT } from "./logic/constants";
import { validateSimulationInput } from "./logic/validation";
import { Onboarding } from "./components/Onboarding";
import { SimpleDashboard } from "./components/SimpleDashboard";
import { AnalysisTabType } from "./logic/uiConstants";

const ReportPrintView = lazy(() => import("./components/ReportPrintView").then((m) => ({ default: m.ReportPrintView })));
const Layout = lazy(() => import("./components/layout/Layout").then((m) => ({ default: m.Layout })));

export default function App() {
  const [input, setInput] = useState<SimulationInput>(INITIAL_INPUT);

  const [analysisTab, setAnalysisTab] = useState<AnalysisTabType>('charts');
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');
  const [sidebarTab, setSidebarTab] = useState('basic');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleAfterPrint = () => setShowPrintView(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const validationWarnings = useMemo<ValidationWarning[]>(() => {
    return validateSimulationInput(input);
  }, [input]);

  const { runSimulation, isCalculating, result } = useSimulation();

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSimulation(input, { detailLevel: 'full', includeSampleTimelines: true })
        .catch((error) => console.error("Simulation failed:", error));
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
        <div className="flex-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <div className="brand">
            <span>?뱢</span> ????먯궛 ?쒕??덉씠??Pro
            {isCalculating && <span className="text-xs text-muted ml-2 animate-pulse">Running...</span>}
          </div>
        </div>

        <div className="flex-row" style={{ gap: '1rem', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={viewMode === 'simple' ? 'active' : ''}
              onClick={() => setViewMode('simple')}
            >
              ?맋 媛꾪렪 紐⑤뱶
            </button>
            <button
              className={viewMode === 'pro' ? 'active' : ''}
              onClick={() => setViewMode('pro')}
            >
              ?쫭 ?꾨Ц媛 紐⑤뱶
            </button>
          </div>
          <button
            className="btn-icon"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title={theme === 'light' ? "?ㅽ겕 紐⑤뱶 耳쒓린" : "?쇱씠??紐⑤뱶 耳쒓린"}
            style={{ fontSize: '1.2rem', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {viewMode === 'simple' ? (
        <div className="simple-mode-container">
          <SimpleDashboard input={input} result={result} onInputChange={setInput} />
        </div>
      ) : (
        <Suspense fallback={<div className="text-center text-muted py-8">Loading layout...</div>}>
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

