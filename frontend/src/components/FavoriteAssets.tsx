/**
 * FavoriteAssets Component
 * Save and quickly add frequently used asset classes
 */
import React, { useState, useEffect } from 'react';
import { AssetClass, FavoriteAsset, PortfolioModel } from '../logic/types';

const FAVORITES_KEY = 'retirement_sim_favorite_assets_v1';

// Default popular assets
const DEFAULT_FAVORITES: FavoriteAsset[] = [
    { id: 'sp500', name: 'S&P 500', expectedAnnualReturn: 0.10, annualVolatility: 0.16, category: 'stock' },
    { id: 'intl_stock', name: '선진국 주식 (ex-US)', expectedAnnualReturn: 0.08, annualVolatility: 0.18, category: 'stock' },
    { id: 'em_stock', name: '신흥국 주식', expectedAnnualReturn: 0.09, annualVolatility: 0.22, category: 'stock' },
    { id: 'kospi', name: 'KOSPI200', expectedAnnualReturn: 0.07, annualVolatility: 0.22, category: 'stock' },
    { id: 'us_bond', name: '미국 국채 (중기)', expectedAnnualReturn: 0.04, annualVolatility: 0.05, category: 'bond' },
    { id: 'kr_bond', name: '한국 국고채', expectedAnnualReturn: 0.035, annualVolatility: 0.04, category: 'bond' },
    { id: 'tips', name: '물가연동채 (TIPS)', expectedAnnualReturn: 0.03, annualVolatility: 0.06, category: 'bond' },
    { id: 'gold', name: '금', expectedAnnualReturn: 0.04, annualVolatility: 0.15, category: 'commodity' },
    { id: 'reit', name: '리츠 (REITs)', expectedAnnualReturn: 0.07, annualVolatility: 0.18, category: 'reit' },
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
    stock: 'favorite-stock',
    bond: 'favorite-bond',
    reit: 'favorite-reit',
    commodity: 'favorite-commodity',
    cash: 'favorite-cash',
    other: 'favorite-other'
};

interface Props {
    portfolio: PortfolioModel;
    onChange: (portfolio: PortfolioModel) => void;
}

export function FavoriteAssets({ portfolio, onChange }: Props) {
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
        <div className="card">
            <h3 className="card-header">⭐ 즐겨찾기 자산군</h3>
            <p className="text-sub text-sm mb-4">
                클릭하여 포트폴리오에 빠르게 추가합니다.
            </p>

            {/* Grouped Assets */}
            {Object.entries(groupedFavorites).map(([category, assets]) => (
                <div key={category} className="mb-3">
                    <div className="text-xs font-bold text-sub mb-2">
                        {CATEGORY_LABELS[category as FavoriteAsset['category']] || category}
                    </div>
                    <div className="flex-row flex-wrap favorite-chip-group">
                        {assets.map(fav => (
                            <button
                                key={fav.id}
                                onClick={() => addToPortfolio(fav)}
                                className={`btn btn-pill favorite-chip ${CATEGORY_CLASS[fav.category]}`}
                                title={`수익률: ${(fav.expectedAnnualReturn * 100).toFixed(1)}%, 변동성: ${(fav.annualVolatility * 100).toFixed(1)}%`}
                            >
                                {fav.name}
                                {fav.id.startsWith('custom_') && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCustomFavorite(fav.id);
                                        }}
                                        className="favorite-chip-remove"
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
                <div className="mt-4 p-3 favorite-add-form">
                    <div className="text-sm font-bold mb-2">커스텀 자산 추가</div>
                    <div className="flex-col gap-2">
                        <input
                            type="text"
                            className="input"
                            placeholder="자산명 (예: 비트코인)"
                            value={newAsset.name || ''}
                            onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                        />
                        <div className="flex-row gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-sub">기대수익률</label>
                                <input
                                    type="number"
                                    className="input"
                                    step="0.01"
                                    value={newAsset.expectedAnnualReturn}
                                    onChange={e => setNewAsset({ ...newAsset, expectedAnnualReturn: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-sub">변동성</label>
                                <input
                                    type="number"
                                    className="input"
                                    step="0.01"
                                    value={newAsset.annualVolatility}
                                    onChange={e => setNewAsset({ ...newAsset, annualVolatility: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <select
                            className="select"
                            value={newAsset.category}
                            onChange={e => setNewAsset({ ...newAsset, category: e.target.value as FavoriteAsset['category'] })}
                        >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <div className="flex-row gap-2">
                            <button onClick={addCustomFavorite} className="btn btn-primary btn-sm flex-1">
                                추가
                            </button>
                            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary btn-sm">
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-secondary btn-sm mt-2"
                >
                    ➕ 커스텀 자산 추가
                </button>
            )}
        </div>
    );
}
