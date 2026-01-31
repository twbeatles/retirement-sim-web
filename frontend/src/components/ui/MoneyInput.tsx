import React, { useState, useEffect } from 'react';

interface MoneyInputProps {
    label: string;
    value: number; // in 원
    onChange: (value: number) => void;
    displayUnit?: 'won' | 'man'; // 원 or 만원
    quickButtons?: number[]; // quick add amounts in 만원
    placeholder?: string;
    hint?: string;
}

export function MoneyInput({
    label,
    value,
    onChange,
    displayUnit = 'man',
    quickButtons = [100, 500, 1000, 5000],
    placeholder,
    hint
}: MoneyInputProps) {
    // Convert based on display unit
    const displayValue = displayUnit === 'man' ? Math.round(value / 10000) : value;
    const multiplier = displayUnit === 'man' ? 10000 : 1;

    const [inputValue, setInputValue] = useState(displayValue.toLocaleString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setInputValue(displayValue.toLocaleString());
        }
    }, [displayValue, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setInputValue(raw);
        const numValue = parseInt(raw) || 0;
        onChange(numValue * multiplier);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setInputValue(displayValue.toLocaleString());
    };

    const handleFocus = () => {
        setIsFocused(true);
        setInputValue(displayValue.toString());
    };

    const addQuickAmount = (amount: number) => {
        onChange(value + amount * 10000);
    };

    return (
        <div className="money-input">
            <label className="money-input-label">{label}</label>
            <div className="money-input-wrapper">
                <input
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className="money-input-field"
                />
                <span className="money-input-unit">
                    {displayUnit === 'man' ? '만원' : '원'}
                </span>
            </div>
            {quickButtons && quickButtons.length > 0 && (
                <div className="money-input-quick">
                    {quickButtons.map((amount) => (
                        <button
                            key={amount}
                            type="button"
                            onClick={() => addQuickAmount(amount)}
                            className="money-input-quick-btn"
                        >
                            +{amount >= 10000 ? `${amount / 10000}억` : `${amount}만`}
                        </button>
                    ))}
                </div>
            )}
            {hint && <p className="money-input-hint">{hint}</p>}
            <style>{`
                .money-input {
                    margin-bottom: var(--space-md);
                }
                .money-input-label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-sub);
                    margin-bottom: var(--space-xs);
                }
                .money-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .money-input-field {
                    width: 100%;
                    padding: 12px 60px 12px 16px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    border: 2px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--bg-card);
                    color: var(--text-main);
                    outline: none;
                    transition: all var(--transition-fast);
                }
                .money-input-field:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px var(--primary-light);
                }
                .money-input-unit {
                    position: absolute;
                    right: 16px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-sub);
                }
                .money-input-quick {
                    display: flex;
                    gap: var(--space-xs);
                    margin-top: var(--space-sm);
                    flex-wrap: wrap;
                }
                .money-input-quick-btn {
                    padding: 4px 10px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    background: var(--bg-main);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-full);
                    color: var(--text-sub);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .money-input-quick-btn:hover {
                    background: var(--primary-light);
                    border-color: var(--primary);
                    color: var(--primary);
                }
                .money-input-hint {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin: var(--space-xs) 0 0 0;
                }
            `}</style>
        </div>
    );
}

export default MoneyInput;
