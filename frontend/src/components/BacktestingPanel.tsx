/**
 * BacktestingPanel Component
 * Allows users to run historical backtesting simulations
 */
import React, { useState } from "react";
import type { SimulationInput } from "../logic/types";
import { HISTORICAL_SCENARIOS, HISTORICAL_YEAR_MAX, HISTORICAL_YEAR_MIN } from "../logic/historicalScenarioMeta";
import { Tooltip } from "./Tooltip";

interface BacktestingPanelProps {
    input: SimulationInput;
    onInputChange: (input: SimulationInput) => void;
}

export const BacktestingPanel: React.FC<BacktestingPanelProps> = ({ input, onInputChange }) => {
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const isHistoricalMode = input.simulation_settings.mode === "historical";
    const startYear = input.simulation_settings.historical_start_year || 1985;

    const handleModeToggle = () => {
        const newMode = isHistoricalMode ? "montecarlo" : "historical";
        onInputChange({
            ...input,
            simulation_settings: {
                ...input.simulation_settings,
                mode: newMode
            }
        });
    };

    const handleStartYearChange = (year: number) => {
        onInputChange({
            ...input,
            simulation_settings: {
                ...input.simulation_settings,
                historical_start_year: year
            }
        });
    };

    const handleScenarioSelect = (scenarioId: string) => {
        const scenario = HISTORICAL_SCENARIOS.find((item) => item.id === scenarioId);
        if (scenario) {
            setSelectedScenario(scenarioId);
            handleStartYearChange(scenario.startYear);
        }
    };

    return (
        <div className="card backtesting-panel">
            <div className="backtesting-header">
                <h3 className="backtesting-title">
                    📊 역사적 백테스팅
                    <Tooltip content="실제 1985~2024 시장 데이터로 은퇴 계획을 테스트합니다. 몬테카를로보다 더 현실적인 결과를 제공합니다." />
                </h3>
                <button className={`btn ${isHistoricalMode ? "btn-primary" : "btn-secondary"} backtesting-toggle-btn`} onClick={handleModeToggle}>
                    {isHistoricalMode ? "✓ 활성화됨" : "활성화"}
                </button>
            </div>

            {isHistoricalMode && (
                <>
                    <div className="backtesting-block">
                        <label className="backtesting-label">📌 시나리오 선택</label>
                        <div className="backtesting-grid">
                            {HISTORICAL_SCENARIOS.map((scenario) => (
                                <button
                                    key={scenario.id}
                                    className={`backtesting-scenario-btn ${selectedScenario === scenario.id ? "active" : ""}`}
                                    onClick={() => handleScenarioSelect(scenario.id)}
                                >
                                    <div className="backtesting-scenario-name">{scenario.nameKo}</div>
                                    <div className="backtesting-scenario-desc">{scenario.descriptionKo}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="backtesting-block">
                        <div className="backtesting-year-row">
                            <label className="backtesting-label">📅 시작 연도</label>
                            <span className="backtesting-year-value">{startYear}년</span>
                        </div>
                        <input
                            type="range"
                            min={HISTORICAL_YEAR_MIN}
                            max={HISTORICAL_YEAR_MAX}
                            value={startYear}
                            onChange={(event) => {
                                setSelectedScenario(null);
                                handleStartYearChange(parseInt(event.target.value, 10));
                            }}
                            className="w-full"
                        />
                        <div className="backtesting-year-limits">
                            <span>{HISTORICAL_YEAR_MIN}</span>
                            <span>{HISTORICAL_YEAR_MAX}</span>
                        </div>
                    </div>

                    <div className="backtesting-info-box">
                        <div className="backtesting-info-title">
                            <strong>ℹ️ 백테스팅 방식:</strong>
                        </div>
                        <ul className="backtesting-info-list">
                            <li>{startYear}년부터 시작하는 20개의 롤링 윈도우 시뮬레이션</li>
                            <li>S&P 500, KOSPI, 채권, 리츠 실제 수익률 사용</li>
                            <li>각 시나리오는 1년씩 밀려 시작 (다양한 시장 진입 시점 테스트)</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

