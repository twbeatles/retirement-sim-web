/**
 * BacktestingPanel Component
 * Allows users to run historical backtesting simulations
 */
import React, { useState } from "react";
import type { HistoricalAssetType, SimulationInput } from "../logic/types";
import { HISTORICAL_SCENARIOS, HISTORICAL_YEAR_MAX, HISTORICAL_YEAR_MIN } from "../logic/historicalScenarioMeta";
import { mapAssetClassToHistorical } from "../logic/historicalData";
import { Tooltip } from "./Tooltip";

interface BacktestingPanelProps {
    input: SimulationInput;
    onInputChange: (input: SimulationInput) => void;
}

const HISTORICAL_ASSET_OPTIONS: Array<{ value: HistoricalAssetType; label: string }> = [
    { value: "us_stock", label: "미국 주식" },
    { value: "global_stock", label: "글로벌 주식" },
    { value: "us_bond", label: "미국 채권" },
    { value: "korea_stock", label: "한국 주식" },
    { value: "cash", label: "현금/단기채" },
    { value: "reit", label: "리츠" }
];

export const BacktestingPanel: React.FC<BacktestingPanelProps> = ({ input, onInputChange }) => {
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const isHistoricalMode = input.simulation_settings.mode === "historical";
    const startYear = input.simulation_settings.historical_start_year || 1985;
    const historicalMapping = input.simulation_settings.historical_asset_mapping ?? {};

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

    const handleMappingChange = (assetId: string, mapping: HistoricalAssetType) => {
        onInputChange({
            ...input,
            simulation_settings: {
                ...input.simulation_settings,
                historical_asset_mapping: {
                    ...historicalMapping,
                    [assetId]: mapping
                }
            }
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 flex items-center gap-2">
                    📊 역사적 백테스팅
                    <Tooltip content="실제 1985~2024 시장 데이터로 은퇴 계획을 테스트합니다. 몬테카를로보다 더 현실적인 결과를 제공합니다." />
                </h3>
                <button
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer ${isHistoricalMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                        }`}
                    onClick={handleModeToggle}
                >
                    {isHistoricalMode ? "✓ 활성화됨" : "활성화"}
                </button>
            </div>

            {isHistoricalMode && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">📌 시나리오 선택</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {HISTORICAL_SCENARIOS.map((scenario) => (
                                <button
                                    key={scenario.id}
                                    className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${selectedScenario === scenario.id
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-700 ring-1 ring-blue-400 dark:ring-blue-700"
                                        : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                                        }`}
                                    onClick={() => handleScenarioSelect(scenario.id)}
                                >
                                    <div className="font-bold text-slate-900 dark:text-white mb-1">{scenario.nameKo}</div>
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{scenario.descriptionKo}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">📅 시작 연도</label>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50">{startYear}년</span>
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
                            className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 accent-blue-600 dark:accent-blue-500"
                        />
                        <div className="flex justify-between items-center mt-2.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <span>{HISTORICAL_YEAR_MIN}</span>
                            <span>{HISTORICAL_YEAR_MAX}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-2">
                            <span className="text-base leading-none">ℹ️</span> 백테스팅 방식:
                        </div>
                        <ul className="flex flex-col gap-1.5 m-0 pl-1 text-sm font-medium text-slate-600 dark:text-slate-400 marker:text-blue-500 list-inside list-disc">
                            <li>{startYear}년부터 시작하는 20개의 롤링 윈도우 시뮬레이션</li>
                            <li>S&P 500, KOSPI, 채권, 리츠 실제 수익률 사용</li>
                            <li>각 시나리오는 1년씩 밀려 시작 (다양한 시장 진입 시점 테스트)</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700/50 rounded-xl">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">🧩 자산 매핑 (Historical Source)</div>
                        <div className="flex flex-col gap-3">
                            {input.portfolio.assetClasses.map((asset) => {
                                const selected = historicalMapping[asset.id]
                                    ?? historicalMapping[asset.name]
                                    ?? mapAssetClassToHistorical(asset.name);
                                return (
                                    <div key={asset.id} className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2 items-center">
                                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{asset.name}</div>
                                        <select
                                            className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                            value={selected}
                                            onChange={(event) => handleMappingChange(asset.id, event.target.value as HistoricalAssetType)}
                                        >
                                            {HISTORICAL_ASSET_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                            * 매핑은 `asset.id` 기준으로 저장되며, 엔진에서 기본 이름 매핑보다 우선 적용됩니다.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

