import type { ReactNode } from "react";

interface CollapsibleSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
}

export function CollapsibleSection({
    title,
    isOpen,
    onToggle,
    children
}: CollapsibleSectionProps) {
    return (
        <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden mb-3 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50"
            >
                <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{title}</span>
                <span className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 text-sm ${isOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[1000px] opacity-100 border-t border-slate-100 dark:border-zinc-800" : "max-h-0 opacity-0 border-t-0"}`}>
                <div className="p-4 bg-white dark:bg-zinc-900/50">
                    {children}
                </div>
            </div>
        </div>
    );
}
