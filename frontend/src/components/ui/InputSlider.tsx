import React, { useEffect, useState } from "react";

interface InputSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    hint?: string;
    formatValue?: (value: number) => string;
}

export function InputSlider({
    label,
    value,
    onChange,
    min,
    max,
    step = 1,
    unit = "",
    hint,
    formatValue
}: InputSliderProps) {
    const [draftValue, setDraftValue] = useState(value);

    useEffect(() => {
        setDraftValue(value);
    }, [value]);

    const commit = () => {
        if (draftValue !== value) {
            onChange(draftValue);
        }
    };

    const displayValue = formatValue ? formatValue(draftValue) : draftValue.toLocaleString();

    return (
        <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    {displayValue}
                    {unit && <span className="text-sm font-semibold text-slate-500 dark:text-blue-300/80 ml-1">{unit}</span>}
                </span>
            </div>
            <div className="relative py-2 px-1">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={draftValue}
                    onChange={(e) => setDraftValue(Number(e.target.value))}
                    onMouseUp={commit}
                    onTouchEnd={commit}
                    onBlur={commit}
                    onKeyUp={(e) => {
                        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
                            commit();
                        }
                    }}
                    className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer outline-none transition-all hover:bg-slate-300 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-blue-500/50 accent-blue-600"
                />
            </div>
            {hint && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}

export default InputSlider;

