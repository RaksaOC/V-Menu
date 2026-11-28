"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, PlayCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../tour/ThemeToggle";
import s from "./landing.module.css";
import { Logo } from "./Parts";

const LINKS = [
    { href: "#how", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#team", label: "For your team" },
    { href: "#faq", label: "FAQ" },
];

// The top bar: it turns frosted once the page scrolls, and folds into a menu on small screens.
export function LandingNav({ onOpenTour }: { onOpenTour: () => void }) {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const close = () => setOpen(false);

    return (
        <header className={`${s.nav} ${scrolled || open ? s.navScrolled : ""}`}>
            <div className={`${s.container} ${s.navInner}`}>
                <Logo />
                <nav aria-label="Main" className={s.navLinks}>
                    {LINKS.map((l) => (
                        <a key={l.href} href={l.href} className={s.navLink}>
                            {l.label}
                        </a>
                    ))}
                </nav>
                <div className={s.navActions}>
                    <ThemeToggle className={s.iconBtn} />
                    <button type="button" className={`${s.navLink} ${s.hideSmall}`} onClick={onOpenTour}>
                        <PlayCircle size={16} aria-hidden="true" /> Tour
                    </button>
                    <Link href="/login" className={`${s.navLink} ${s.hideSmall}`}>
                        Log in
                    </Link>
                    <Link href="/signup" className={s.btnSm}>
                        Start free <ArrowRight size={15} className={s.arrow} aria-hidden="true" />
                    </Link>
                    <button
                        type="button"
                        className={`${s.iconBtn} ${s.menuBtn}`}
                        aria-expanded={open}
                        aria-controls="mobile-menu"
                        aria-label={open ? "Close menu" : "Open menu"}
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {open && (
                    <motion.nav
                        id="mobile-menu"
                        aria-label="Menu"
                        className={`${s.container} ${s.mobileMenu}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {LINKS.map((l) => (
                            <a key={l.href} href={l.href} className={s.navLink} onClick={close}>
                                {l.label}
                            </a>
                        ))}
                        <button
                            type="button"
                            className={s.navLink}
                            onClick={() => {
                                close();
                                onOpenTour();
                            }}
                        >
                            <PlayCircle size={16} aria-hidden="true" /> Take the tour
                        </button>
                        <Link href="/login" className={s.navLink}>
                            Log in
                        </Link>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
}
