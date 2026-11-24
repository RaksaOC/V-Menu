"use client";

import { useEffect, useState } from "react";

type Sentinel = { release(): Promise<void>; addEventListener?(type: "release", fn: () => void): void };
type WakeLock = { request(type: "screen"): Promise<Sentinel> };

/**
 * VM-29: keeps the screen on while the page is open (Screen Wake Lock API). The browser drops the
 * lock when the tab is hidden, so it's asked for again when the tab comes back.
 * "unsupported": the browser has no wake lock; "off": it was refused or released.
 */
export function useWakeLock(): "on" | "off" | "unsupported" {
    const [state, setState] = useState<"on" | "off" | "unsupported">("off");
    useEffect(() => {
        const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
        if (!wakeLock?.request) {
            setState("unsupported");
            return;
        }
        let live = true;
        let sentinel: Sentinel | null = null;
        const acquire = async () => {
            try {
                const next = await wakeLock.request("screen");
                if (!live) return void next.release().catch(() => {});
                sentinel = next;
                setState("on");
                next.addEventListener?.("release", () => live && setState("off"));
            } catch {
                if (live) setState("off");
            }
        };
        acquire();
        const onVisible = () => {
            if (document.visibilityState === "visible") acquire();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            live = false;
            document.removeEventListener("visibilitychange", onVisible);
            sentinel?.release().catch(() => {});
        };
    }, []);
    return state;
}
