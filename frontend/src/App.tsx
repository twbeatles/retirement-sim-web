import React, { useMemo, useState, useEffect } from "react";
import { useSimulation } from "./hooks/useSimulation";
import type { SimulationInput, ValidationWarning } from "./logic/types";
import { INITIAL_INPUT } from "./logic/constants";
import { validateSimulationInput } from "./logic/validation";
import { Onboarding } from "./components/Onboarding";
import { SimpleDashboard } from "./components/SimpleDashboard";
import { Layout } from "./components/layout/Layout";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { AnalysisTabType } from "./logic/uiConstants";

export default function App() {
  const [input, setInput] = useState<SimulationInput>(INITIAL_INPUT);

  // View State
  const [analysisTab, setAnalysisTab] = useState<AnalysisTabType>('charts');
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');
  const [sidebarTab, setSidebarTab] = useState('basic');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Mobile Detection (used for Header adjustments if needed)
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Input Validation
  const validationWarnings = useMemo<ValidationWarning[]>(() => {
    return validateSimulationInput(input);
  }, [input]);

  // Use custom hook for simulation
  const { runSimulation, isCalculating, result } = useSimulation();

  // Debounced simulation run
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation(input);
    }, 400);

    return () => clearTimeout(timer);
  }, [input, runSimulation]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="flex-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <div className="brand">
            <span>📈</span> 은퇴 자산 시뮬레이터 Pro
            {isCalculating && <span className="text-xs text-muted ml-2 animate-pulse">Running...</span>}
          </div>
        </div>

        <div className="flex-row" style={{ gap: '1rem', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={viewMode === 'simple' ? 'active' : ''}
              onClick={() => setViewMode('simple')}
            >
              🐣 간편 모드
            </button>
            <button
              className={viewMode === 'pro' ? 'active' : ''}
              onClick={() => setViewMode('pro')}
            >
              🦅 전문가 모드
            </button>
          </div>
          <button
            className="btn-icon"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? "다크 모드 켜기" : "라이트 모드 켜기"}
            style={{ fontSize: '1.2rem', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header >

      {viewMode === 'simple' ? (
        <div className="simple-mode-container">
          <SimpleDashboard input={input} result={result} onInputChange={setInput} />
        </div>
      ) : (
        <Layout
          input={input}
          setInput={setInput}
          result={result}
          validationWarnings={validationWarnings}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          analysisTab={analysisTab}
          setAnalysisTab={setAnalysisTab}
        />
      )}

      {/* Onboarding Modal - Global */}
      <Onboarding />
    </div >
  );
}
