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

export const MoneyInput = React.memo(function MoneyInput({
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
        <div className="flex flex-col gap-2 w-full max-w-[400px]">
            {label && <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>}
            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 hover:border-slate-300 dark:hover:border-zinc-600">
                <input
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className="flex-1 w-full py-3 px-4 bg-transparent border-none text-right text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                />
                <span className="pr-4 text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap select-none">{displayUnit === "man" ? "만원" : "원"}</span>
            </div>
            {quickButtons && quickButtons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                    {quickButtons.map((amount) => (
                        <button
                            key={amount}
                            type="button"
                            onClick={() => addQuickAmount(amount)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
                        >
                            +{amount >= 10000 ? `${amount / 10000}억` : `${amount}만`}
                        </button>
                    ))}
                </div>
            )}
            {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
        </div>
    );
});

export default MoneyInput;

