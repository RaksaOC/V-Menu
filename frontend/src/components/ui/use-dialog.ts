"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * What every dialog does (CL-09, VM-36): moves focus inside when it opens, closes on Escape,
 * keeps Tab inside, and gives focus back to whatever opened it. Used by Modal, the owner's menu
 * on small screens and the landing page tour.
 */
export function useDialog(panel: RefObject<HTMLElement | null>, onClose: () => void, { focusPanel = false } = {}) {
    const close = useRef(onClose);
    close.current = onClose;

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        (focusPanel ? panel.current : (focusables()[0] ?? panel.current))?.focus({ preventScroll: true });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                close.current();
            } else if (e.key === "Tab") {
                const items = focusables();
                if (items.length === 0) return e.preventDefault();
                const first = items[0];
                const last = items[items.length - 1];
                const inside = panel.current?.contains(document.activeElement);
                if (e.shiftKey && (document.activeElement === first || !inside)) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            opener?.focus?.();
        };
        // runs once per opening; onClose is read through the ref
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
