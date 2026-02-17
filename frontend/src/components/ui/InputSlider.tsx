import React, { useEffect, useState } from 'react';

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
    unit = '',
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
    const percentage = ((draftValue - min) / (max - min)) * 100;

    return (
        <div className="input-slider">
            <div className="input-slider-header">
                <label className="input-slider-label">{label}</label>
                <span className="input-slider-value">
                    {displayValue}{unit && <span className="input-slider-unit">{unit}</span>}
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
                    onKeyUp={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                            commit();
                        }
                    }}
                    onBlur={commit}
                    className="input-slider-range"
                    style={{
                        background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`
                    }}
                />
            </div>
            {hint && <p className="input-slider-hint">{hint}</p>}
            <style>{`
                .input-slider {
                    margin-bottom: var(--space-lg);
                }
                .input-slider-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: var(--space-sm);
                }
                .input-slider-label {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-main);
                }
                .input-slider-value {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--primary);
                }
                .input-slider-unit {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-sub);
                    margin-left: 4px;
                }
                .input-slider-track-container {
                    position: relative;
                    width: 100%;
                }
                .input-slider-range {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 8px;
                    border-radius: 9999px;
                    outline: none;
                    cursor: pointer;
                }
                .input-slider-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--bg-card);
                    border: 3px solid var(--primary);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                    cursor: pointer;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .input-slider-range::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                }
                .input-slider-range::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--bg-card);
                    border: 3px solid var(--primary);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                    cursor: pointer;
                }
                .input-slider-hint {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin: var(--space-xs) 0 0 0;
                }
            `}</style>
        </div>
    );
}

export default InputSlider;

