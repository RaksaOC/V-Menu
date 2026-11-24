"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/* Only the landing page, a restaurant's page (/<slug>, VM-32), the sign-in / sign-up screens, the UI kit page and the customer's
   menu, cart and order pages (VM-33) have dark styles. The staff screens (owner, cashier, kitchen) were built light-only,
   so they always render light, even when the saved choice is dark. The same rule runs before first paint in layout.tsx;
   this component re-applies it on client-side navigation. */
export const DARK_READY = `p==="/"||p==="/ui-kit"||p==="/login"||p==="/signup"||/\\/login$/.test(p)||/^\\/(?!owner$)[^/]+$/.test(p)||/^\\/[^/]+\\/(customer|t)\\/[^/]+(\\/cart|\\/orders\\/[^/]+)?$/.test(p)`;

export function applyTheme(pathname: string) {
    const p = pathname;
    let saved = "light";
    try {
        saved = localStorage.getItem("vm-theme") === "dark" ? "dark" : "light";
    } catch {}
    const supportsDark =
        p === "/" ||
        p === "/ui-kit" ||
        p === "/login" ||
        p === "/signup" ||
        /\/login$/.test(p) ||
        /^\/(?!owner$)[^/]+$/.test(p) ||
        /^\/[^/]+\/(customer|t)\/[^/]+(\/cart|\/orders\/[^/]+)?$/.test(p); // VM-33
    const theme = supportsDark ? saved : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
}

export function ThemeSync() {
    const pathname = usePathname();
    useEffect(() => applyTheme(pathname), [pathname]);
    return null;
}
