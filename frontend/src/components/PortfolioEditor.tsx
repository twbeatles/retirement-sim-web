import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { PortfolioModel, AssetClass } from "../logic/types";
import { Tooltip } from "./Tooltip";

// Default presets
const PRESETS = [
    {
        id: 'balanced',
        name: "60/40",
        desc: "주식/채권 균형형",
        icon: "⚖️",
        risk: "중간",
        color: "#4f46e5",
        assets: [
            { id: "stock", name: "주식 (Global/US)", expectedAnnualReturn: 0.08, annualVolatility: 0.18, allocation: 0.6 },
            { id: "bond", name: "채권 (Gov/Agg)", expectedAnnualReturn: 0.035, annualVolatility: 0.05, allocation: 0.4 }
        ]
    },
    {
        id: 'aggressive',
        name: "80/20",
        desc: "공격적 성장형",
        icon: "🚀",
        risk: "높음",
        color: "#dc2626",
        assets: [
            { id: "stock", name: "주식 (Global/US)", expectedAnnualReturn: 0.08, annualVolatility: 0.18, allocation: 0.8 },
            { id: "bond", name: "채권 (Gov/Agg)", expectedAnnualReturn: 0.035, annualVolatility: 0.05, allocation: 0.2 }
        ]
    },
    {
        id: 'allweather',
        name: "올웨더",
        desc: "사계절 분산형",
        icon: "🌈",
        risk: "낮음",
        color: "#059669",
        assets: [
            { id: "stock", name: "주식", expectedAnnualReturn: 0.075, annualVolatility: 0.16, allocation: 0.3 },
            { id: "bond_long", name: "장기국채", expectedAnnualReturn: 0.04, annualVolatility: 0.12, allocation: 0.4 },
            { id: "inter", name: "중기/원자재", expectedAnnualReturn: 0.04, annualVolatility: 0.10, allocation: 0.3 },
        ]
    },
    {
        id: 'conservative',
        name: "예금형",
        desc: "안전 자산 100%",
        icon: "🏦",
        risk: "매우 낮음",
        color: "#2563eb",
        assets: [
            { id: "cash", name: "예적금", expectedAnnualReturn: 0.03, annualVolatility: 0.005, allocation: 1.0 }
        ]
    }
];

const ASSET_COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface Props {
    portfolio: PortfolioModel;
    onChange: (p: PortfolioModel) => void;
}

export function PortfolioEditor({ portfolio, onChange }: Props) {
    const assets = portfolio.assetClasses;

    const metrics = useMemo(() => {
        let ret = 0;
        let vol = 0;
        let totalAlloc = 0;
        assets.forEach(a => {
            ret += a.expectedAnnualReturn * a.allocation;
            vol += a.annualVolatility * a.allocation;
            totalAlloc += a.allocation;
        });
        return { ret, vol, totalAlloc };
    }, [assets]);

    const pieData = useMemo(() => {
        return assets.map((a, i) => ({
            name: a.name,
            value: a.allocation * 100,
            color: ASSET_COLORS[i % ASSET_COLORS.length]
        }));
    }, [assets]);

    const currentPreset = PRESETS.find(p =>
        JSON.stringify(p.assets.map(a => ({ id: a.id, allocation: a.allocation }))) ===
        JSON.stringify(assets.map(a => ({ id: a.id, allocation: a.allocation })))
    );

    const updateAsset = (index: number, field: keyof AssetClass, value: any) => {
        const newAssets = [...assets];
        newAssets[index] = { ...newAssets[index], [field]: value };
        onChange({ ...portfolio, assetClasses: newAssets });
    };

    const loadPreset = (presetId: string) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (preset) {
            onChange({ ...portfolio, assetClasses: JSON.parse(JSON.stringify(preset.assets)) });
        }
    };

    const getRiskLevel = (vol: number) => {
        if (vol < 0.05) return { label: '매우 낮음', color: 'var(--success)' };
        if (vol < 0.10) return { label: '낮음', color: '#22c55e' };
        if (vol < 0.15) return { label: '중간', color: 'var(--warning)' };
        return { label: '높음', color: 'var(--danger)' };
    };

    const risk = getRiskLevel(metrics.vol);

    return (
        <div className="card portfolio-editor">
            <h3 className="card-header">📊 포트폴리오 설정</h3>

            {/* Preset Selection - Card Style */}
            <div className="preset-grid">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        className={`preset-button ${currentPreset?.id === preset.id ? 'active' : ''}`}
                        onClick={() => loadPreset(preset.id)}
                    >
                        <span className="preset-icon">{preset.icon}</span>
                        <span className="preset-name">{preset.name}</span>
                        <span className="preset-desc">{preset.desc}</span>
                    </button>
                ))}
            </div>

            {/* Visual Allocation */}
            <div className="portfolio-visual">
                <div className="pie-chart-container">
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => `${value.toFixed(0)}%`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="allocation-legend">
                    {assets.map((asset, i) => (
                        <div key={i} className="legend-item">
                            <span
                                className="legend-color"
                                style={{ background: ASSET_COLORS[i % ASSET_COLORS.length] }}
                            />
                            <span className="legend-name">{asset.name}</span>
                            <span className="legend-value">{(asset.allocation * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Allocation Sliders */}
            <div className="allocation-sliders">
                {assets.map((asset, i) => (
                    <div key={i} className="allocation-slider-item">
                        <div className="slider-header">
                            <span
                                className="asset-color-dot"
                                style={{ background: ASSET_COLORS[i % ASSET_COLORS.length] }}
                            />
                            <span className="asset-name">
                                {asset.name}
                                <Tooltip content={`기대 수익률: ${(asset.expectedAnnualReturn * 100).toFixed(1)}%, 변동성: ${(asset.annualVolatility * 100).toFixed(1)}%`} />
                            </span>
                            <span className="asset-allocation">{(asset.allocation * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={asset.allocation * 100}
                            onChange={(e) => updateAsset(i, "allocation", Number(e.target.value) / 100)}
                            className="allocation-range"
                            style={{
                                background: `linear-gradient(to right, ${ASSET_COLORS[i % ASSET_COLORS.length]} 0%, ${ASSET_COLORS[i % ASSET_COLORS.length]} ${asset.allocation * 100}%, var(--border) ${asset.allocation * 100}%, var(--border) 100%)`
                            }}
                        />
                        <div className="slider-meta">
                            <span className="meta-item">수익 {(asset.expectedAnnualReturn * 100).toFixed(1)}%</span>
                            <span className="meta-item">변동성 {(asset.annualVolatility * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Portfolio Summary */}
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
                    <span className="summary-value" style={{ color: risk.color }}>{risk.label}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">총 비중</span>
                    <span className={`summary-value ${metrics.totalAlloc !== 1 ? 'error' : ''}`}>
                        {(metrics.totalAlloc * 100).toFixed(0)}%
                        {metrics.totalAlloc !== 1 && <span className="error-hint"> (100% 필요)</span>}
                    </span>
                </div>
            </div>

            {/* Correlation Setting */}
            <div className="correlation-setting">
                <div className="correlation-header">
                    <span className="correlation-label">
                        자산 간 상관계수
                        <Tooltip content="자산들이 얼마나 비슷하게 움직이는지를 나타냅니다. 1에 가까울수록 같이 움직이고(위험 분산 효과 없음), 낮을수록 반대로 움직여 위험을 낮춰줍니다." />
                    </span>
                    <input
                        type="number"
                        step="0.1"
                        min="-1"
                        max="1"
                        value={portfolio.manualCorrelation ?? 1.0}
                        onChange={(e) => onChange({ ...portfolio, manualCorrelation: Number(e.target.value) })}
                        className="correlation-input"
                    />
                </div>
                <p className="correlation-hint">
                    💡 낮은 상관계수 = 분산투자 효과 (추천: 0.3)
                </p>
            </div>

            <style>{`
                .portfolio-editor {
                    overflow: visible;
                }

                /* Preset Grid */
                .preset-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: var(--space-sm);
                    margin-bottom: var(--space-lg);
                }
                @media (max-width: 600px) {
                    .preset-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .preset-button {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    padding: var(--space-md);
                    background: var(--bg-main);
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .preset-button:hover {
                    border-color: var(--primary);
                    background: var(--primary-light);
                }
                .preset-button.active {
                    border-color: var(--primary);
                    background: var(--primary-light);
                    box-shadow: 0 0 0 2px var(--primary-light);
                }
                .preset-icon {
                    font-size: 1.5rem;
                }
                .preset-name {
                    font-weight: 700;
                    font-size: 0.85rem;
                    color: var(--text-main);
                }
                .preset-desc {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    text-align: center;
                }

                /* Visual Allocation */
                .portfolio-visual {
                    display: flex;
                    align-items: center;
                    gap: var(--space-lg);
                    margin-bottom: var(--space-lg);
                    padding: var(--space-md);
                    background: var(--bg-main);
                    border-radius: var(--radius);
                }
                .pie-chart-container {
                    flex-shrink: 0;
                    width: 160px;
                }
                .allocation-legend {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }
                .legend-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 3px;
                    flex-shrink: 0;
                }
                .legend-name {
                    flex: 1;
                    font-size: 0.85rem;
                    color: var(--text-main);
                }
                .legend-value {
                    font-weight: 700;
                    font-size: 0.85rem;
                    color: var(--text-main);
                }

                /* Sliders */
                .allocation-sliders {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-lg);
                    margin-bottom: var(--space-lg);
                }
                .allocation-slider-item {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-xs);
                }
                .slider-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }
                .asset-color-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }
                .asset-name {
                    flex: 1;
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                .asset-allocation {
                    font-weight: 700;
                    color: var(--primary);
                }
                .allocation-range {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 6px;
                    border-radius: 9999px;
                    outline: none;
                    cursor: pointer;
                }
                .allocation-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--bg-card);
                    border: 3px solid var(--primary);
                    box-shadow: var(--shadow-sm);
                    cursor: pointer;
                }
                .slider-meta {
                    display: flex;
                    gap: var(--space-lg);
                }
                .meta-item {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                /* Summary */
                .portfolio-summary {
                    padding: var(--space-md);
                    background: var(--bg-main);
                    border-radius: var(--radius);
                    margin-bottom: var(--space-md);
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-xs) 0;
                }
                .summary-label {
                    color: var(--text-sub);
                    font-size: 0.85rem;
                }
                .summary-value {
                    font-weight: 700;
                    font-size: 0.9rem;
                }
                .summary-value.error {
                    color: var(--danger);
                }
                .error-hint {
                    font-weight: 400;
                    font-size: 0.75rem;
                }

                /* Correlation */
                .correlation-setting {
                    padding: var(--space-md);
                    background: var(--bg-main);
                    border-radius: var(--radius);
                }
                .correlation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-xs);
                }
                .correlation-label {
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                .correlation-input {
                    width: 70px;
                    padding: 4px 8px;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    text-align: center;
                    font-weight: 600;
                }
                .correlation-hint {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    );
}
