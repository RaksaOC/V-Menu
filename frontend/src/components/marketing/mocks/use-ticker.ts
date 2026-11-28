"use client";

import { useEffect, useState } from "react";

/**
 * A counter that goes up by one every `ms`, for product pictures that play a little story on a
 * loop. It waits while the tab is hidden, and `start` sets where it begins.
 */
export function useTicker(ms = 1600, start = 0) {
    const [tick, setTick] = useState(start);
    useEffect(() => {
        const id = window.setInterval(() => {
            if (!document.hidden) setTick((n) => n + 1);
        }, ms);
        return () => window.clearInterval(id);
    }, [ms]);
    return tick;
}
