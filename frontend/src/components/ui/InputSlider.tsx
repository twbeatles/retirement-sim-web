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
        <div className="flex flex-col gap-2 relative bg-white/40 dark:bg-zinc-800/40 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-700/50 shadow-sm">
            <div className="flex justify-between items-baseline mb-2 gap-2 min-w-0">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">{label}</label>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight bg-white/80 dark:bg-zinc-900/80 shadow-inner px-3 py-1 rounded-xl border border-blue-100/50 dark:border-blue-900/30 whitespace-nowrap shrink-0">
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
                    className="w-full h-2.5 bg-slate-200/80 dark:bg-zinc-700/80 rounded-full appearance-none cursor-pointer outline-none transition-all hover:bg-slate-300 dark:hover:bg-zinc-600 focus:ring-4 focus:ring-blue-500/30 accent-blue-500 dark:accent-blue-400 shadow-inner"
                />
            </div>
            {hint && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 break-keep min-w-0">{hint}</p>}
        </div>
    );
}

export default InputSlider;

