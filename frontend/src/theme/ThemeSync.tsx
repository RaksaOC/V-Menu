"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/* Only the landing page, a restaurant's page (/<slug>, VM-32), the sign-in / sign-up screens, the UI kit page, the customer's
   menu, cart and order pages (VM-33) and the kitchen screen (VM-34) have dark styles. The cashier and owner screens were
   built light-only, so they always render light, even when the saved choice is dark. The same rule runs before first paint
   (themeScript, in layout.tsx); this component re-applies it on client-side navigation. */
export const DARK_READY = `p==="/"||p==="/ui-kit"||p==="/login"||p==="/signup"||/\\/login$/.test(p)||/^\\/(?!owner$)[^/]+$/.test(p)||/^\\/[^/]+\\/(customer|t)\\/[^/]+(\\/cart|\\/orders\\/[^/]+)?$/.test(p)||/^\\/[^/]+\\/kitchen(\\/history)?$/.test(p)`;

/* VM-34: the kitchen screen is dark unless the kitchen picked light, and keeps its own choice
   (vm-kitchen-theme), so a kitchen tablet's setting doesn't change the other pages. */
const KITCHEN = /^\/[^/]+\/kitchen(\/history)?$/;
export const KITCHEN_THEME_KEY = "vm-kitchen-theme";

/** Sets the theme before first paint; layout.tsx puts it in an inline script. */
export const themeScript = `try{var p=location.pathname;var k=${KITCHEN}.test(p);var s=localStorage.getItem(k?"${KITCHEN_THEME_KEY}":"vm-theme");var t=(k?s!=="light":s==="dark")&&(${DARK_READY})?"dark":"light";var d=document.documentElement;d.dataset.theme=t;d.classList.toggle("dark",t==="dark")}catch(e){}`;

export function applyTheme(pathname: string) {
    const p = pathname;
    const kitchen = KITCHEN.test(p);
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(kitchen ? KITCHEN_THEME_KEY : "vm-theme");
    } catch {}
    const supportsDark =
        p === "/" ||
        p === "/ui-kit" ||
        p === "/login" ||
        p === "/signup" ||
        /\/login$/.test(p) ||
        /^\/(?!owner$)[^/]+$/.test(p) ||
        /^\/[^/]+\/(customer|t)\/[^/]+(\/cart|\/orders\/[^/]+)?$/.test(p) || // VM-33
        kitchen; // VM-34
    const dark = kitchen ? saved !== "light" : saved === "dark";
    const theme = supportsDark && dark ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
}

export function ThemeSync() {
    const pathname = usePathname();
    useEffect(() => applyTheme(pathname), [pathname]);
    return null;
}
