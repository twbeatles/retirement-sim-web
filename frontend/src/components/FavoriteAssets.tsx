/**
 * FavoriteAssets Component
 * Save and quickly add frequently used asset classes
 */
import React, { useState, useEffect } from 'react';
import { type AssetClass, type FavoriteAsset, type PortfolioModel } from '../logic/types';

const FAVORITES_KEY = 'retirement_sim_favorite_assets_v1';

// Default popular assets
const DEFAULT_FAVORITES: FavoriteAsset[] = [
    { id: 'sp500', name: 'S&P 500', expectedAnnualReturn: 0.10, annualVolatility: 0.16, category: 'stock' },
    { id: 'intl_stock', name: '선진국 주식 (미국 제외)', expectedAnnualReturn: 0.08, annualVolatility: 0.18, category: 'stock' },
    { id: 'em_stock', name: '신흥국 주식', expectedAnnualReturn: 0.09, annualVolatility: 0.22, category: 'stock' },
    { id: 'kospi', name: 'KOSPI200', expectedAnnualReturn: 0.07, annualVolatility: 0.22, category: 'stock' },
    { id: 'us_bond', name: '미국 국채 (중기)', expectedAnnualReturn: 0.04, annualVolatility: 0.05, category: 'bond' },
    { id: 'kr_bond', name: '한국 국고채', expectedAnnualReturn: 0.035, annualVolatility: 0.04, category: 'bond' },
    { id: 'tips', name: '물가연동채', expectedAnnualReturn: 0.03, annualVolatility: 0.06, category: 'bond' },
    { id: 'gold', name: '금', expectedAnnualReturn: 0.04, annualVolatility: 0.15, category: 'commodity' },
    { id: 'reit', name: '리츠', expectedAnnualReturn: 0.07, annualVolatility: 0.18, category: 'reit' },
    { id: 'cash', name: '예금/현금', expectedAnnualReturn: 0.025, annualVolatility: 0.005, category: 'cash' }
];

const CATEGORY_LABELS: Record<FavoriteAsset['category'], string> = {
    stock: '📈 주식',
    bond: '📊 채권',
    reit: '🏢 리츠',
    commodity: '🥇 원자재',
    cash: '💵 현금',
    other: '📦 기타'
};

const CATEGORY_CLASS: Record<FavoriteAsset['category'], string> = {
    stock: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-800/60 dark:hover:border-blue-700',
    bond: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-800/60 dark:hover:border-emerald-700',
    reit: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-800/60 dark:hover:border-purple-700',
    commodity: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-800/60 dark:hover:border-amber-700',
    cash: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/80 dark:hover:border-slate-600',
    other: 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700/80 dark:hover:border-zinc-600'
};

interface Props {
    portfolio: PortfolioModel;
    onChange: (portfolio: PortfolioModel) => void;
}

export const FavoriteAssets = React.memo(function FavoriteAssets({ portfolio, onChange }: Props) {
    const [favorites, setFavorites] = useState<FavoriteAsset[]>(DEFAULT_FAVORITES);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAsset, setNewAsset] = useState<Partial<FavoriteAsset>>({
        category: 'stock',
        expectedAnnualReturn: 0.08,
        annualVolatility: 0.15
    });

    // Load saved favorites
    useEffect(() => {
        const saved = localStorage.getItem(FAVORITES_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFavorites([...DEFAULT_FAVORITES, ...parsed]);
            } catch (e) {
                console.error("Failed to load favorites", e);
            }
        }
    }, []);

    // Save custom favorites
    const saveCustomFavorites = (customOnly: FavoriteAsset[]) => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(customOnly));
    };

    // Add favorite to portfolio
    const addToPortfolio = (fav: FavoriteAsset) => {
        // Check if already exists
        const exists = portfolio.assetClasses.some(a => a.id === fav.id);
        if (exists) {
            alert(`${fav.name}는 이미 포트폴리오에 있습니다.`);
            return;
        }

        const newAssetClass: AssetClass = {
            id: fav.id,
            name: fav.name,
            expectedAnnualReturn: fav.expectedAnnualReturn,
            annualVolatility: fav.annualVolatility,
            allocation: 0.1 // Default 10%
        };

        onChange({
            ...portfolio,
            assetClasses: [...portfolio.assetClasses, newAssetClass]
        });
    };

    // Add custom favorite
    const addCustomFavorite = () => {
        if (!newAsset.name) {
            alert('자산명을 입력해주세요.');
            return;
        }

        const custom: FavoriteAsset = {
            id: 'custom_' + Date.now(),
            name: newAsset.name || '',
            expectedAnnualReturn: newAsset.expectedAnnualReturn || 0.08,
            annualVolatility: newAsset.annualVolatility || 0.15,
            category: newAsset.category as FavoriteAsset['category'] || 'other'
        };

        const customFavorites = favorites.filter(f => f.id.startsWith('custom_'));
        const newCustom = [...customFavorites, custom];
        saveCustomFavorites(newCustom);
        setFavorites([...DEFAULT_FAVORITES, ...newCustom]);
        setShowAddForm(false);
        setNewAsset({ category: 'stock', expectedAnnualReturn: 0.08, annualVolatility: 0.15 });
    };

    // Remove custom favorite
    const removeCustomFavorite = (id: string) => {
        const newFavorites = favorites.filter(f => f.id !== id);
        const customOnly = newFavorites.filter(f => f.id.startsWith('custom_'));
        saveCustomFavorites(customOnly);
        setFavorites(newFavorites);
    };

    // Group favorites by category
    const groupedFavorites = favorites.reduce((acc, fav) => {
        if (!acc[fav.category]) acc[fav.category] = [];
        acc[fav.category].push(fav);
        return acc;
    }, {} as Record<string, FavoriteAsset[]>);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 mt-0">⭐ 즐겨찾기 자산군</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">
                클릭하여 포트폴리오에 빠르게 추가합니다.
            </p>

            {/* Grouped Assets */}
            {Object.entries(groupedFavorites).map(([category, assets]) => (
                <div key={category} className="mb-4 last:mb-0">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                        {CATEGORY_LABELS[category as FavoriteAsset['category']] || category}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {assets.map(fav => (
                            <button
                                key={fav.id}
                                onClick={() => addToPortfolio(fav)}
                                className={`group relative inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-full border transition-all duration-200 cursor-pointer ${CATEGORY_CLASS[fav.category]}`}
                                title={`수익률: ${(fav.expectedAnnualReturn * 100).toFixed(1)}%, 변동성: ${(fav.annualVolatility * 100).toFixed(1)}%`}
                            >
                                {fav.name}
                                {fav.id.startsWith('custom_') && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCustomFavorite(fav.id);
                                        }}
                                        className="ml-2 w-4 h-4 inline-flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-[10px] transition-colors"
                                    >
                                        ✕
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Add Custom Form */}
            {showAddForm ? (
                <div className="mt-6 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700/50">
                    <div className="text-sm font-bold text-slate-900 dark:text-white mb-3">커스텀 자산 추가</div>
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            placeholder="자산명 (예: 비트코인)"
                            value={newAsset.name || ''}
                            onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                        />
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">기대수익률</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-right"
                                    step="0.01"
                                    value={newAsset.expectedAnnualReturn}
                                    onChange={e => setNewAsset({ ...newAsset, expectedAnnualReturn: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">변동성</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-right"
                                    step="0.01"
                                    value={newAsset.annualVolatility}
                                    onChange={e => setNewAsset({ ...newAsset, annualVolatility: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <select
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                            value={newAsset.category}
                            onChange={e => setNewAsset({ ...newAsset, category: e.target.value as FavoriteAsset['category'] })}
                        >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 pt-1">
                            <button onClick={addCustomFavorite} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors cursor-pointer text-sm">
                                추가
                            </button>
                            <button onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer text-sm">
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors text-sm w-full cursor-pointer flex items-center justify-center gap-2"
                >
                    <span className="text-base leading-none">➕</span> 커스텀 자산 추가
                </button>
            )}
        </div>
    );
});
