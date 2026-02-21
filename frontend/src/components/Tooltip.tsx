import React, { useState } from "react";

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <span
            className="relative inline-flex items-center justify-center group"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)}
        >
            {children || <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] sm:text-[11px] font-bold text-white bg-slate-400 dark:bg-slate-500 rounded-full cursor-help hover:bg-slate-500 dark:hover:bg-slate-400 transition-colors shadow-sm ml-1 select-none">?</span>}

            {isVisible && (
                <div className="absolute z-50 w-max max-w-[200px] sm:max-w-xs px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-white bg-slate-800 dark:bg-zinc-800 rounded-lg shadow-lg bottom-full left-1/2 -translate-x-1/2 -translate-y-2 text-center leading-relaxed backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                    {content}
                    <div className="absolute w-2 h-2 bg-slate-800 dark:bg-zinc-800 rotate-45 border-b border-r border-transparent -bottom-1 left-1/2 -ml-1"></div>
                </div>
            )}
        </span>
    );
};

