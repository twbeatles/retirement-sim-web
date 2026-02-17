import { useEffect, useState } from "react";

function getMatch(query: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => getMatch(query));

    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

        setMatches(media.matches);
        media.addEventListener("change", listener);

        return () => {
            media.removeEventListener("change", listener);
        };
    }, [query]);

    return matches;
}

