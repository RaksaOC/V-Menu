"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, PlayCircle } from "lucide-react";
import Link from "next/link";
import { HeroStage } from "./HeroStage";
import s from "./landing.module.css";
import { ease } from "./motion";

const LINES = ["Guests scan.", "The kitchen cooks."];
const TRUST = ["No app for your guests", "Set up in minutes", "Works on any phone"];

/** The opening screen: headline, the two calls to action, and the product in motion. */
export function Hero({ onOpenTour }: { onOpenTour: () => void }) {
    return (
        <section className={s.hero} aria-labelledby="hero-title">
            <div className={s.glow} aria-hidden="true" />
            <div className={s.grid} aria-hidden="true" />
            <div className={`${s.container} ${s.heroInner}`}>
                <h1 id="hero-title" className={s.heroTitle}>
                    {LINES.map((line, i) => (
                        <span key={line} className={s.mask}>
                            <motion.span
                                initial={{ y: "110%" }}
                                animate={{ y: 0 }}
                                transition={{ delay: 0.1 + i * 0.12, duration: 0.9, ease }}
                            >
                                {line}
                            </motion.span>
                        </span>
                    ))}
                    <span className={s.mask}>
                        <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: 0.34, duration: 0.9, ease }}>
                            <span className={s.accentWord}>
                                You get paid.
                                <svg className={s.underline} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                                    <motion.path
                                        d="M4 14 C 80 4, 200 4, 296 12"
                                        fill="none"
                                        stroke="var(--accent)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        pathLength={1}
                                        strokeDasharray="1"
                                        initial={{ strokeDashoffset: 1 }}
                                        animate={{ strokeDashoffset: 0 }}
                                        transition={{ delay: 1, duration: 0.9, ease }}
                                    />
                                </svg>
                            </span>
                        </motion.span>
                    </span>
                </h1>

                <motion.div
                    className={s.ctaRow}
                    initial={{ y: 16, filter: "blur(10px)" }}
                    animate={{ y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                    transition={{ delay: 0.7, duration: 0.8, ease }}
                >
                    <Link href="/signup" className={s.btn}>
                        Start free <ArrowRight size={18} className={s.arrow} aria-hidden="true" />
                    </Link>
                    <button type="button" className={s.btnGhost} onClick={onOpenTour}>
                        <PlayCircle size={18} aria-hidden="true" /> Take the 1-minute tour
                    </button>
                </motion.div>

                <motion.ul
                    className={s.trust}
                    initial={{ y: 10, filter: "blur(8px)" }}
                    animate={{ y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                >
                    {TRUST.map((t) => (
                        <li key={t}>
                            <Check size={16} className={s.tick} aria-hidden="true" /> {t}
                        </li>
                    ))}
                </motion.ul>

                <HeroStage />
            </div>
        </section>
    );
}
