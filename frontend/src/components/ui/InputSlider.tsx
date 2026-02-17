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
        <div className="input-slider">
            <div className="input-slider-header">
                <label className="input-slider-label">{label}</label>
                <span className="input-slider-value">
                    {displayValue}
                    {unit && <span className="input-slider-unit">{unit}</span>}
                </span>
            </div>
            <div className="input-slider-track-container">
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
                    className="input-slider-range"
                />
            </div>
            {hint && <p className="input-slider-hint">{hint}</p>}
        </div>
    );
}

export default InputSlider;

