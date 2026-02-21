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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all w-full">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800 mt-0">📊 포트폴리오 설정</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${currentPreset?.id === preset.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/20"
                            : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                            }`}
                        onClick={() => loadPreset(preset.id)}
                    >
                        <span className="text-2xl mb-1 bg-slate-50 dark:bg-zinc-900 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">{preset.icon}</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">{preset.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{preset.desc}</span>
                    </button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-8 p-4 bg-slate-50 lg:bg-transparent dark:bg-zinc-800/50 lg:dark:bg-transparent rounded-xl">
                <div className="w-[160px] md:w-[200px] h-[160px] md:h-[200px] relative -my-4 md:-my-8 mx-auto flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" paddingAngle={2} dataKey="value" stroke="none">
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                formatter={(value: number) => `${value.toFixed(0)}%`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap md:flex-col gap-2.5 md:gap-3 flex-1 justify-center md:justify-start">
                    {assets.map((asset, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white dark:bg-zinc-900 md:bg-transparent md:dark:bg-transparent px-3 py-1.5 md:p-0 rounded-full md:rounded-none shadow-sm md:shadow-none border border-slate-100 dark:border-zinc-800 md:border-none">
                            <span
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: ASSET_COLORS[index % ASSET_COLORS.length] }}
                            />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-[100px]">{asset.name}</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{(asset.allocation * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-5 mb-8">
                {assets.map((asset, index) => (
                    <div key={index} className="p-4 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                                <span
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: ASSET_COLORS[index % ASSET_COLORS.length] }}
                                />
                                <span className="flex items-center gap-1.5">
                                    {asset.name}
                                    <Tooltip
                                        content={`기대 수익률: ${(asset.expectedAnnualReturn * 100).toFixed(1)}%, 변동성: ${(asset.annualVolatility * 100).toFixed(1)}%`}
                                    />
                                </span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-md shadow-sm border border-slate-100 dark:border-zinc-700 tabular-nums text-sm">
                                {(asset.allocation * 100).toFixed(0)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={asset.allocation * 100}
                            onChange={(event) => updateAsset(index, "allocation", Number(event.target.value) / 100)}
                            className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 accent-blue-600 dark:accent-blue-500"
                        />
                        <div className="flex justify-between mt-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span>수익 {(asset.expectedAnnualReturn * 100).toFixed(1)}%</span>
                            <span>변동성 {(asset.annualVolatility * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 p-4 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        기대 수익률
                        <Tooltip content="포트폴리오 내 자산들의 가중 평균 기대 수익률입니다. (CAGR)" />
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{(metrics.ret * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        예상 변동성
                        <Tooltip content="포트폴리오의 표준편차입니다. 클수록 자산 가치의 등락폭이 커집니다. (상관계수 반영)" />
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{(metrics.vol * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">리스크 수준</span>
                    <span className={`text-sm font-bold w-fit px-2.5 py-1 rounded-full ${metrics.vol < 0.05 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            metrics.vol < 0.1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                metrics.vol < 0.15 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                        {riskLabel}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">총 비중</span>
                    <span className={`text-lg font-bold flex items-center gap-2 ${metrics.totalAlloc !== 1 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-500"}`}>
                        {(metrics.totalAlloc * 100).toFixed(0)}%
                        {metrics.totalAlloc !== 1 && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md font-semibold whitespace-nowrap">100% 필요</span>}
                    </span>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
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
                        className="w-full sm:w-28 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="text-amber-500">💡</span> 낮은 상관계수 = 분산투자 효과 (추천: 0.3)
                </p>
            </div>
        </div>
    );
}

