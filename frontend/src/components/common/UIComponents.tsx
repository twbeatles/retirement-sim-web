import React, { useEffect, useState } from 'react';

// Helper Components
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="card">
            <h3 className="card-header">{title}</h3>
            {children}
        </div>
    );
}

export function Field(props: { label: string; value: any; step?: string; onChange: (v: string) => void; suffix?: string }) {
    const [draftValue, setDraftValue] = useState(String(props.value ?? ''));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDraftValue(String(props.value ?? ''));
        }
    }, [props.value, isFocused]);

    const commit = () => {
        props.onChange(draftValue);
    };

    return (
        <div className="input-group">
            <label className="label">{props.label}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    className="input"
                    type="number"
                    value={draftValue}
                    step={props.step}
                    onFocus={() => setIsFocused(true)}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onBlur={() => {
                        setIsFocused(false);
                        commit();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.currentTarget as HTMLInputElement).blur();
                        }
                    }}
                    style={{ paddingRight: props.suffix ? '45px' : undefined }}
                />
                {props.suffix && (
                    <span
                        style={{
                            position: 'absolute',
                            right: '12px',
                            color: 'var(--text-sub)',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                        }}
                    >
                        {props.suffix}
                    </span>
                )}
            </div>
        </div>
    );
}

export function SummaryCard({ title, value, desc, color }: { title: string; value: string; desc: string; color?: string }) {
    return (
        <div className="summary-card" style={{ borderLeftColor: color }}>
            <div className="summary-title">{title}</div>
            <div className="summary-value" style={{ color: color }}>{value}</div>
            <div className="summary-desc">{desc}</div>
        </div>
    );
}

