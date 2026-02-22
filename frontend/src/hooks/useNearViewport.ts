import { useEffect, useRef, useState } from "react";

type NearViewportOptions = {
    enabled?: boolean;
    rootMargin?: string;
    once?: boolean;
};

export function useNearViewport(options: NearViewportOptions = {}) {
    const { enabled = true, rootMargin = "360px", once = true } = options;
    const ref = useRef<HTMLDivElement | null>(null);
    const [isNearViewport, setIsNearViewport] = useState(!enabled);

    useEffect(() => {
        if (!enabled) {
            setIsNearViewport(true);
            return;
        }

        if (typeof IntersectionObserver === "undefined") {
            setIsNearViewport(true);
            return;
        }

        const element = ref.current;
        if (!element) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting) {
                    return;
                }
                setIsNearViewport(true);
                if (once) {
                    observer.disconnect();
                }
            },
            { root: null, rootMargin, threshold: 0 }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [enabled, once, rootMargin]);

    return { ref, isNearViewport };
}
