"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

// Light/dark switch. Sets both hooks the styles read: data-theme (deep-lab tokens) and the
// .dark class (Tailwind's dark: variant), and remembers the choice for every page. VM-34: the
// kitchen keeps its own choice, under its own key.
export function ThemeToggle({ className, storageKey = "vm-theme" }: { className?: string; storageKey?: string }) {
    const [dark, setDark] = useState(false);
    useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

    const toggle = () => {
        const next = !dark;
        const root = document.documentElement;
        root.classList.toggle("dark", next);
        root.dataset.theme = next ? "dark" : "light";
        try {
            localStorage.setItem(storageKey, next ? "dark" : "light");
        } catch {}
        setDark(next);
    };

    return (
        <button className={className} onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}
