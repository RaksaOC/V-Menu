"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/* Only the landing page, a restaurant's page (/<slug>, VM-32), the sign-in / sign-up screens and the UI kit page have dark styles. The working
   screens (owner, cashier, kitchen, customer) were built light-only, so they always render
   light, even when the saved choice is dark. The same rule runs before first paint in
   layout.tsx; this component re-applies it on client-side navigation. */
export const DARK_READY = `p==="/"||p==="/ui-kit"||p==="/login"||p==="/signup"||/\\/login$/.test(p)||/^\\/(?!owner$)[^/]+$/.test(p)`;

export function applyTheme(pathname: string) {
    const p = pathname;
    let saved = "light";
    try {
        saved = localStorage.getItem("vm-theme") === "dark" ? "dark" : "light";
    } catch {}
    const supportsDark =
        p === "/" || p === "/ui-kit" || p === "/login" || p === "/signup" || /\/login$/.test(p) || /^\/(?!owner$)[^/]+$/.test(p);
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
