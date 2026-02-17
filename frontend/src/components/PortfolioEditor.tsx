import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { PortfolioModel, AssetClass } from "../logic/types";
import { Tooltip } from "./Tooltip";

const PRESETS = [
    {
        id: "balanced",
        name: "60/40",
        desc: "주식/채권 균형형",
        icon: "⚖️",
        assets: [
            { id: "stock", name: "주식 (Global/US)", expectedAnnualReturn: 0.08, annualVolatility: 0.18, allocation: 0.6 },
            { id: "bond", name: "채권 (Gov/Agg)", expectedAnnualReturn: 0.035, annualVolatility: 0.05, allocation: 0.4 }
        ]
    },
    {
        id: "aggressive",
        name: "80/20",
        desc: "공격적 성장형",
        icon: "🚀",
        assets: [
            { id: "stock", name: "주식 (Global/US)", expectedAnnualReturn: 0.08, annualVolatility: 0.18, allocation: 0.8 },
            { id: "bond", name: "채권 (Gov/Agg)", expectedAnnualReturn: 0.035, annualVolatility: 0.05, allocation: 0.2 }
        ]
    },
    {
        id: "allweather",
        name: "올웨더",
        desc: "사계절 분산형",
        icon: "🌈",
        assets: [
            { id: "stock", name: "주식", expectedAnnualReturn: 0.075, annualVolatility: 0.16, allocation: 0.3 },
            { id: "bond_long", name: "장기국채", expectedAnnualReturn: 0.04, annualVolatility: 0.12, allocation: 0.4 },
            { id: "inter", name: "중기/원자재", expectedAnnualReturn: 0.04, annualVolatility: 0.1, allocation: 0.3 }
        ]
    },
    {
        id: "conservative",
        name: "예금형",
        desc: "안전 자산 100%",
        icon: "🏦",
        assets: [{ id: "cash", name: "예적금", expectedAnnualReturn: 0.03, annualVolatility: 0.005, allocation: 1.0 }]
    }
];

const ASSET_COLORS = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface Props {
    portfolio: PortfolioModel;
    onChange: (p: PortfolioModel) => void;
}

function getAssetColorClass(index: number) {
    return `asset-color-${index % ASSET_COLORS.length}`;
}

function getRiskClass(volatility: number) {
    if (volatility < 0.05) return "risk-lowest";
    if (volatility < 0.1) return "risk-low";
    if (volatility < 0.15) return "risk-medium";
    return "risk-high";
}

function getRiskLabel(volatility: number) {
    if (volatility < 0.05) return "매우 낮음";
    if (volatility < 0.1) return "낮음";
    if (volatility < 0.15) return "중간";
    return "높음";
}

export function PortfolioEditor({ portfolio, onChange }: Props) {
    const assets = portfolio.assetClasses;

    const metrics = useMemo(() => {
        let ret = 0;
        let vol = 0;
        let totalAlloc = 0;
        assets.forEach((asset) => {
            ret += asset.expectedAnnualReturn * asset.allocation;
            vol += asset.annualVolatility * asset.allocation;
            totalAlloc += asset.allocation;
        });
        return { ret, vol, totalAlloc };
    }, [assets]);

    const pieData = useMemo(
        () =>
            assets.map((asset, index) => ({
                name: asset.name,
                value: asset.allocation * 100,
                color: ASSET_COLORS[index % ASSET_COLORS.length]
            })),
        [assets]
    );

    const currentPreset = PRESETS.find(
        (preset) =>
            JSON.stringify(preset.assets.map((asset) => ({ id: asset.id, allocation: asset.allocation }))) ===
            JSON.stringify(assets.map((asset) => ({ id: asset.id, allocation: asset.allocation })))
    );

    const updateAsset = (index: number, field: keyof AssetClass, value: AssetClass[keyof AssetClass]) => {
        const newAssets = [...assets];
        newAssets[index] = { ...newAssets[index], [field]: value };
        onChange({ ...portfolio, assetClasses: newAssets });
    };

    const loadPreset = (presetId: string) => {
        const preset = PRESETS.find((item) => item.id === presetId);
        if (preset) {
            onChange({ ...portfolio, assetClasses: JSON.parse(JSON.stringify(preset.assets)) });
        }
    };

    const riskClass = getRiskClass(metrics.vol);
    const riskLabel = getRiskLabel(metrics.vol);

    return (
        <div className="card portfolio-editor">
            <h3 className="card-header">📊 포트폴리오 설정</h3>

            <div className="preset-grid">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        className={`preset-button ${currentPreset?.id === preset.id ? "active" : ""}`}
                        onClick={() => loadPreset(preset.id)}
                    >
                        <span className="preset-icon">{preset.icon}</span>
                        <span className="preset-name">{preset.name}</span>
                        <span className="preset-desc">{preset.desc}</span>
                    </button>
                ))}
            </div>

            <div className="portfolio-visual">
                <div className="pie-chart-container">
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => `${value.toFixed(0)}%`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="allocation-legend">
                    {assets.map((asset, index) => (
                        <div key={index} className="legend-item">
                            <span className={`legend-color ${getAssetColorClass(index)}`} />
                            <span className="legend-name">{asset.name}</span>
                            <span className="legend-value">{(asset.allocation * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="allocation-sliders">
                {assets.map((asset, index) => (
                    <div key={index} className="allocation-slider-item">
                        <div className="slider-header">
                            <span className={`asset-color-dot ${getAssetColorClass(index)}`} />
                            <span className="asset-name">
                                {asset.name}
                                <Tooltip
                                    content={`기대 수익률: ${(asset.expectedAnnualReturn * 100).toFixed(1)}%, 변동성: ${(
                                        asset.annualVolatility * 100
                                    ).toFixed(1)}%`}
                                />
                            </span>
                            <span className="asset-allocation">{(asset.allocation * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={asset.allocation * 100}
                            onChange={(event) => updateAsset(index, "allocation", Number(event.target.value) / 100)}
                            className={`allocation-range ${getAssetColorClass(index)}`}
                        />
                        <div className="slider-meta">
                            <span className="meta-item">수익 {(asset.expectedAnnualReturn * 100).toFixed(1)}%</span>
                            <span className="meta-item">변동성 {(asset.annualVolatility * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="portfolio-summary">
                <div className="summary-row">
                    <span className="summary-label">
                        기대 수익률
                        <Tooltip content="포트폴리오 내 자산들의 가중 평균 기대 수익률입니다. (CAGR)" />
                    </span>
                    <span className="summary-value">{(metrics.ret * 100).toFixed(1)}%</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">
                        예상 변동성
                        <Tooltip content="포트폴리오의 표준편차입니다. 클수록 자산 가치의 등락폭이 커집니다. (상관계수 반영)" />
                    </span>
                    <span className="summary-value">{(metrics.vol * 100).toFixed(1)}%</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">리스크 수준</span>
                    <span className={`summary-value ${riskClass}`}>{riskLabel}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">총 비중</span>
                    <span className={`summary-value ${metrics.totalAlloc !== 1 ? "error" : ""}`}>
                        {(metrics.totalAlloc * 100).toFixed(0)}%
                        {metrics.totalAlloc !== 1 && <span className="error-hint"> (100% 필요)</span>}
                    </span>
                </div>
            </div>

            <div className="correlation-setting">
                <div className="correlation-header">
                    <span className="correlation-label">
                        자산 간 상관계수
                        <Tooltip content="자산들이 얼마나 비슷하게 움직이는지를 나타냅니다. 1에 가까울수록 같이 움직이고, 낮을수록 분산 효과가 커집니다." />
                    </span>
                    <input
                        type="number"
                        step="0.1"
                        min="-1"
                        max="1"
                        value={portfolio.manualCorrelation ?? 1.0}
                        onChange={(event) => onChange({ ...portfolio, manualCorrelation: Number(event.target.value) })}
                        className="correlation-input"
                    />
                </div>
                <p className="correlation-hint">💡 낮은 상관계수 = 분산투자 효과 (추천: 0.3)</p>
            </div>
        </div>
    );
}

