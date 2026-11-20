import React, { useEffect, useId, useRef } from "react";

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
}

let hintFallbackInstalled = false;

// popover="hint" is not recognized in browsers with native popover but no
// hint support (e.g. Safari): it falls back to manual, which never
// light-dismisses and ignores Esc. Flip such toggletips to auto as they
// open so click/Esc/light-dismiss keep working everywhere.
function installHintFallback() {
    if (hintFallbackInstalled || typeof document === "undefined") {
        return;
    }
    hintFallbackInstalled = true;
    const probe = document.createElement("div");
    (probe as any).popover = "hint";
    if ((probe as any).popover === "hint") {
        return;
    }
    document.addEventListener(
        "beforetoggle",
        (event) => {
            const target = (event as Event).target as HTMLElement | null;
            const newState = (event as any).newState as string | undefined;
            if (
                newState === "open" &&
                target?.getAttribute("popover") === "hint" &&
                target.id &&
                document.querySelector(`[popovertarget="${CSS.escape(target.id)}"]`)
            ) {
                target.setAttribute("popover", "auto");
            }
        },
        true
    );
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const tipId = `toggletip-${uid}`;
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const tipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        installHintFallback();
        const button = buttonRef.current;
        const tip = tipRef.current;
        if (!button || !tip) {
            return;
        }
        // Set imperatively: React does not pass the interestfor IDL
        // attribute through to the DOM.
        button.setAttribute("interestfor", tipId);
        // Keep aria-expanded in sync from the popover's toggle event: the
        // popover is the source of truth (Esc, light-dismiss, or another
        // invoker can all close it).
        const onToggle = (event: Event) => {
            button.setAttribute(
                "aria-expanded",
                String((event as any).newState === "open")
            );
        };
        tip.addEventListener("toggle", onToggle);
        return () => {
            tip.removeEventListener("toggle", onToggle);
        };
    }, [tipId]);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-expanded="false"
                {...(children
                    ? {}
                    : { "aria-label": "추가 설명 보기" })}
                {...({ popovertarget: tipId, popovertargetaction: "show" } as any)}
                className="relative inline-flex items-center justify-center cursor-help rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
                {children || <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] sm:text-[11px] font-bold text-white bg-slate-400 dark:bg-slate-500 rounded-full hover:bg-slate-500 dark:hover:bg-slate-400 transition-colors shadow-sm ml-1 select-none">?</span>}
            </button>
            <div
                ref={tipRef}
                id={tipId}
                role="tooltip"
                data-toggletip-popover
                {...({ popover: "hint" } as any)}
                className="w-max max-w-[200px] sm:max-w-xs px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-white bg-slate-800 dark:bg-zinc-800 rounded-lg shadow-lg text-center leading-relaxed"
            >
                {content}
            </div>
        </>
    );
};
