"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { STEPS } from "@/content/tour";
import { SCENES } from "./scenes";
import styles from "./Tour.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

// The technical tour, shown as a centred dialog over the landing page.
export function Tour({ onClose }: { onClose: () => void }) {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const dialog = useRef<HTMLDivElement>(null);
    const step = STEPS[index];
    const Scene = SCENES[step.id];
    const last = index === STEPS.length - 1;

    const go = useCallback((next: number) => {
        const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
        setIndex((current) => {
            setDirection(clamped >= current ? 1 : -1);
            return clamped;
        });
    }, []);

    useEffect(() => {
        dialog.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go, index, onClose]);

    return (
        <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease }}>
            <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div
                    ref={dialog}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tour-title"
                    className={styles.dialog}
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.2 } }}
                >
                    <button className={styles.close} onClick={onClose} aria-label="Close the tour">
                        <X size={18} />
                    </button>

                    <div className={styles.main}>
                        <section className={styles.copy} aria-live="polite">
                            <AnimatePresence mode="wait" custom={direction} initial={false}>
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: direction * 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: direction * -24, transition: { duration: 0.2 } }}
                                >
                                    <p className={styles.eyebrow}>{step.eyebrow}</p>
                                    <h2 id="tour-title" className={index === 0 ? styles.titleHero : styles.title}>
                                        {step.title}
                                    </h2>
                                    <p className={styles.lead}>{step.lead}</p>
                                    <ul className={styles.points}>
                                        {step.points.map((point, i) => (
                                            <motion.li
                                                key={point}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.12 + i * 0.07 }}
                                            >
                                                {point}
                                            </motion.li>
                                        ))}
                                    </ul>
                                    {step.note && <p className={styles.note}>{step.note}</p>}
                                </motion.div>
                            </AnimatePresence>
                        </section>

                        <section className={styles.stage} aria-label={`${step.label} illustration`}>
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={step.id}
                                    className={styles.stageInner}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
                                >
                                    <Scene />
                                </motion.div>
                            </AnimatePresence>
                        </section>
                    </div>

                    <footer className={styles.footer}>
                        <nav
                            className={styles.rail}
                            style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}
                            aria-label="Tour steps"
                        >
                            {STEPS.map((s, i) => (
                                <button
                                    key={s.id}
                                    className={`${styles.railItem} ${i === index ? styles.railActive : ""} ${i < index ? styles.railDone : ""}`}
                                    onClick={() => go(i)}
                                    aria-current={i === index ? "step" : undefined}
                                >
                                    <span className={styles.railBar}>
                                        {i === index && <motion.span layoutId="rail-fill" className={styles.railFill} />}
                                    </span>
                                    <span className={styles.railLabel}>{s.label}</span>
                                </button>
                            ))}
                        </nav>
                        <div className={styles.nav}>
                            <button className={styles.ghostBtn} onClick={() => go(index - 1)} disabled={index === 0}>
                                Back
                            </button>
                            <span className={styles.counter}>
                                {String(index + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                            </span>
                            <button className={styles.primaryBtn} onClick={() => (last ? onClose() : go(index + 1))}>
                                {last ? "Close tour" : index === 0 ? "Start the tour" : "Next"}
                            </button>
                        </div>
                    </footer>
                </motion.div>
            </motion.div>
        </MotionConfig>
    );
}
