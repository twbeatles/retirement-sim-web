import React, { useState, useEffect } from "react";

interface MoneyInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    displayUnit?: "won" | "man";
    quickButtons?: number[];
    placeholder?: string;
    hint?: string;
}

export function MoneyInput({
    label,
    value,
    onChange,
    displayUnit = "man",
    quickButtons = [100, 500, 1000, 5000],
    placeholder,
    hint
}: MoneyInputProps) {
    const displayValue = displayUnit === "man" ? Math.round(value / 10000) : value;
    const multiplier = displayUnit === "man" ? 10000 : 1;
    const [inputValue, setInputValue] = useState(displayValue.toLocaleString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setInputValue(displayValue.toLocaleString());
        }
    }, [displayValue, isFocused]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value.replace(/[^0-9]/g, "");
        setInputValue(raw);
        const nextValue = parseInt(raw, 10) || 0;
        onChange(nextValue * multiplier);
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
                <span className="money-input-unit">{displayUnit === "man" ? "만원" : "원"}</span>
            </div>
            {quickButtons && quickButtons.length > 0 && (
                <div className="money-input-quick">
                    {quickButtons.map((amount) => (
                        <button key={amount} type="button" onClick={() => addQuickAmount(amount)} className="money-input-quick-btn">
                            +{amount >= 10000 ? `${amount / 10000}억` : `${amount}만`}
                        </button>
                    ))}
                </div>
            )}
            {hint && <p className="money-input-hint">{hint}</p>}
        </div>
    );
}

export default MoneyInput;

