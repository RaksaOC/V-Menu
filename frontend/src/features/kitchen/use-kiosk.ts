"use client";

import { useEffect, useRef, useState } from "react";

// VM-29: kiosk mode. Large type and full screen; remembered on this device.
const KIOSK_KEY = "kitchen:kiosk";

const readKiosk = () => {
    try {
        return localStorage.getItem(KIOSK_KEY) === "1";
    } catch {
        return false;
    }
};

export function useKiosk() {
    const [kiosk, setKiosk] = useState(false);
    const enteredFullscreen = useRef(false);

    useEffect(() => setKiosk(readKiosk()), []);

    // leaving full screen (Esc, or the system) leaves kiosk mode too
    useEffect(() => {
        const onChange = () => {
            if (!document.fullscreenElement && enteredFullscreen.current) {
                enteredFullscreen.current = false;
                setKiosk(false);
                try {
                    localStorage.removeItem(KIOSK_KEY);
                } catch {
                    /* private mode */
                }
            }
        };
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const toggleKiosk = () => {
        const next = !kiosk;
        setKiosk(next);
        try {
            if (next) localStorage.setItem(KIOSK_KEY, "1");
            else localStorage.removeItem(KIOSK_KEY);
        } catch {
            /* private mode: kiosk mode just isn't remembered */
        }
        if (next) {
            // full screen needs this tap; where it's refused (some tablets), the large type still applies
            document.documentElement
                .requestFullscreen?.()
                .then(() => (enteredFullscreen.current = true))
                .catch(() => {});
        } else if (document.fullscreenElement) {
            enteredFullscreen.current = false;
            document.exitFullscreen?.().catch(() => {});
        }
    };

    return { kiosk, toggleKiosk };
}
