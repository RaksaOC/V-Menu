"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Tracks polling (VM-03): `lost` turns true after `threshold` failures in a row and false again
 * on the next success. Kitchen uses it now; the cashier's bills will when they poll (VM-11).
 */
export function useConnectionStatus(threshold = 2) {
    const failures = useRef(0);
    const [lost, setLost] = useState(false);
    const succeeded = useCallback(() => {
        failures.current = 0;
        setLost(false);
    }, []);
    const failed = useCallback(() => {
        failures.current += 1;
        if (failures.current >= threshold) setLost(true);
    }, [threshold]);
    return { lost, succeeded, failed };
}
