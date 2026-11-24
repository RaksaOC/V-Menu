"use client";

import { useEffect, useState } from "react";

// Small hooks the tour scenes share.

/** A counter that steps 0..count-1 every `ms`, for scenes that animate through a list. */
export function useTicker(count: number, ms = 1600) {
    const [i, setI] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setI((n) => (n + 1) % count), ms);
        return () => window.clearInterval(id);
    }, [count, ms]);
    return i;
}

type Health = "checking" | "up" | "down";
export function useServiceHealth(ms = 6000) {
    const [state, setState] = useState<Record<string, Health>>({ restaurant: "checking", menu: "checking", order: "checking" });
    useEffect(() => {
        let alive = true;
        const check = () =>
            Promise.all(
                ["restaurant", "menu", "order"].map(async (name) => {
                    try {
                        const res = await fetch(`/api/health/${name}`, { cache: "no-store" });
                        return [name, res.ok ? "up" : "down"] as const;
                    } catch {
                        return [name, "down"] as const;
                    }
                }),
            ).then((pairs) => alive && setState(Object.fromEntries(pairs)));
        check();
        const id = window.setInterval(check, ms);
        return () => {
            alive = false;
            window.clearInterval(id);
        };
    }, [ms]);
    return state;
}
