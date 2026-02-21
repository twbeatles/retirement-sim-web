import React, { useEffect, useState } from "react";

export const Section = React.memo(function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all mb-4 w-full text-slate-900 dark:text-slate-100">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800 mt-0">{title}</h3>
            {children}
        </div>
    );
});

export const Field = React.memo(function Field(props: { label: string; value: any; step?: string; onChange: (v: string) => void; suffix?: string }) {
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
        <div className="flex flex-col gap-1.5 mb-3 w-full min-w-0">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">{props.label}</label>
            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 hover:border-slate-300 dark:hover:border-zinc-600">
                <input
                    className={`flex-1 w-full py-2 px-3 bg-transparent border-none text-right font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ${props.suffix ? "pr-1" : ""}`}
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
                {props.suffix && <span className="pr-3 text-slate-500 dark:text-slate-400 text-sm font-semibold whitespace-nowrap select-none">{props.suffix}</span>}
            </div>
        </div>
    );
});

export const SummaryCard = React.memo(function SummaryCard({ title, value, desc, color }: { title: string; value: string; desc: string; color?: string }) {
    const toneClass =
        color === "var(--success)"
            ? "text-success"
            : color === "var(--warning)"
                ? "text-warning"
                : color === "var(--danger)"
                    ? "text-danger"
                    : "";

    return (
        <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 lg:p-5 flex flex-col gap-1 border border-slate-100 dark:border-zinc-800 transition-all hover:-translate-y-0.5 shadow-sm text-center lg:text-left h-full">
            <div className="text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</div>
            <div className={`text-xl lg:text-2xl font-black mt-1 mb-1 tracking-tight ${toneClass || 'text-slate-900 dark:text-white'}`}>{value}</div>
            <div className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 font-medium">{desc}</div>
        </div>
    );
});

