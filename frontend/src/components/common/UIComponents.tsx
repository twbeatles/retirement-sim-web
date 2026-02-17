import React, { useEffect, useState } from "react";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="card">
            <h3 className="card-header">{title}</h3>
            {children}
        </div>
    );
}

export function Field(props: { label: string; value: any; step?: string; onChange: (v: string) => void; suffix?: string }) {
    const [draftValue, setDraftValue] = useState(String(props.value ?? ""));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDraftValue(String(props.value ?? ""));
        }
    }, [props.value, isFocused]);

    const commit = () => {
        props.onChange(draftValue);
    };

    return (
        <div className="input-group">
            <label className="label">{props.label}</label>
            <div className="field-control">
                <input
                    className={`input field-input ${props.suffix ? "with-suffix" : ""}`}
                    type="number"
                    value={draftValue}
                    step={props.step}
                    onFocus={() => setIsFocused(true)}
                    onChange={(event) => setDraftValue(event.target.value)}
                    onBlur={() => {
                        setIsFocused(false);
                        commit();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            (event.currentTarget as HTMLInputElement).blur();
                        }
                    }}
                />
                {props.suffix && <span className="field-suffix">{props.suffix}</span>}
            </div>
        </div>
    );
}

export function SummaryCard({ title, value, desc, color }: { title: string; value: string; desc: string; color?: string }) {
    const toneClass =
        color === "var(--success)"
            ? "text-success"
            : color === "var(--warning)"
              ? "text-warning"
              : color === "var(--danger)"
                ? "text-danger"
                : "";

    return (
        <div className="summary-card">
            <div className="summary-title">{title}</div>
            <div className={`summary-value ${toneClass}`}>{value}</div>
            <div className="summary-desc">{desc}</div>
        </div>
    );
}

