/**
 * BacktestingPanel Component
 * Allows users to run historical backtesting simulations
 */
import React, { useState } from 'react';
import type { SimulationInput } from '../logic/types';
import { HISTORICAL_SCENARIOS, HISTORICAL_YEARS } from '../logic/historicalData';
import { Tooltip } from './Tooltip';

interface BacktestingPanelProps {
    input: SimulationInput;
    onInputChange: (input: SimulationInput) => void;
}

export const BacktestingPanel: React.FC<BacktestingPanelProps> = ({ input, onInputChange }) => {
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

    const isHistoricalMode = input.simulation_settings.mode === 'historical';
    const startYear = input.simulation_settings.historical_start_year || 1985;

    const handleModeToggle = () => {
        const newMode = isHistoricalMode ? 'montecarlo' : 'historical';
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
        const scenario = HISTORICAL_SCENARIOS.find(s => s.id === scenarioId);
        if (scenario) {
            setSelectedScenario(scenarioId);
            handleStartYearChange(scenario.startYear);
        }
    };

    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📊 역사적 백테스팅
                    <Tooltip text="실제 1985~2024 시장 데이터로 은퇴 계획을 테스트합니다. 몬테카를로보다 더 현실적인 결과를 제공합니다." />
                </h3>
                <button
                    className={`btn ${isHistoricalMode ? 'btn-primary' : ''}`}
                    onClick={handleModeToggle}
                    style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem'
                    }}
                >
                    {isHistoricalMode ? '✓ 활성화됨' : '활성화'}
                </button>
            </div>

            {isHistoricalMode && (
                <>
                    {/* Scenario Presets */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: 500,
                            color: 'var(--text-main)'
                        }}>
                            📌 시나리오 선택
                        </label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '0.5rem'
                        }}>
                            {HISTORICAL_SCENARIOS.map(scenario => (
                                <button
                                    key={scenario.id}
                                    className={`btn ${selectedScenario === scenario.id ? 'btn-primary' : ''}`}
                                    onClick={() => handleScenarioSelect(scenario.id)}
                                    style={{
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.4,
                                        backgroundColor: selectedScenario === scenario.id
                                            ? 'var(--primary)'
                                            : 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        color: selectedScenario === scenario.id
                                            ? 'white'
                                            : 'var(--text-main)'
                                    }}
                                >
                                    <div style={{ fontWeight: 600 }}>{scenario.nameKo}</div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        opacity: 0.8,
                                        marginTop: '0.25rem'
                                    }}>
                                        {scenario.descriptionKo}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Year Slider */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem'
                        }}>
                            <label style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                📅 시작 연도
                            </label>
                            <span style={{
                                fontWeight: 600,
                                color: 'var(--primary)',
                                fontSize: '1.1rem'
                            }}>
                                {startYear}년
                            </span>
                        </div>
                        <input
                            type="range"
                            min={1985}
                            max={2020}
                            value={startYear}
                            onChange={(e) => {
                                setSelectedScenario(null);
                                handleStartYearChange(parseInt(e.target.value));
                            }}
                            style={{ width: '100%' }}
                        />
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: 'var(--text-sub)'
                        }}>
                            <span>1985</span>
                            <span>2020</span>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-main)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--text-sub)'
                    }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <strong>ℹ️ 백테스팅 방식:</strong>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
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
