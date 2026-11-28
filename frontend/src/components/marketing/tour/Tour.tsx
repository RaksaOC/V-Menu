"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { STEPS } from "@/content/tour";
import { useDialog } from "@/components/ui/use-dialog";
import { SCENES } from "./Scenes";
import styles from "./Tour.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

// The product tour, shown as a centred dialog over the landing page.
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

    useDialog(dialog, onClose, { focusPanel: true }); // VM-36: Escape, focus kept inside, focus back on close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go, index]);

    return (
        <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease }}>
            <motion.div className={styles.backdrop}>
                {/* The scrim fades on its own layer, so the dialog's text never fades with it. */}
                <motion.div className={styles.scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div
                    ref={dialog}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tour-title"
                    className={styles.dialog}
                    initial={{ y: 40, scale: 0.96 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: "110vh", transition: { duration: 0.3 } }}
                >
                    <button className={styles.close} onClick={onClose} aria-label="Close the tour">
                        <X size={18} />
                    </button>

                    <div className={styles.main}>
                        <section className={styles.copy} aria-live="polite">
                            <AnimatePresence mode="wait" custom={direction} initial={false}>
                                <motion.div
                                    key={step.id}
                                    initial={{ x: direction * 24, filter: "blur(8px)" }}
                                    animate={{ x: 0, filter: "blur(0px)" }}
                                    exit={{ x: direction * -24, filter: "blur(8px)", transition: { duration: 0.2 } }}
                                >
                                    <h2 id="tour-title" className={index === 0 ? styles.titleHero : styles.title}>
                                        {step.title}
                                    </h2>
                                    <ul className={styles.points}>
                                        {step.points.map((point, i) => (
                                            <motion.li
                                                key={point}
                                                initial={{ y: 8, filter: "blur(6px)" }}
                                                animate={{ y: 0, filter: "blur(0px)" }}
                                                transition={{ delay: 0.12 + i * 0.07 }}
                                            >
                                                {point}
                                            </motion.li>
                                        ))}
                                    </ul>
                                </motion.div>
                            </AnimatePresence>
                        </section>

                        <section className={styles.stage} aria-label={`${step.label} illustration`}>
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={step.id}
                                    className={styles.stageInner}
                                    initial={{ scale: 0.92, filter: "blur(8px)" }}
                                    animate={{ scale: 1, filter: "blur(0px)" }}
                                    exit={{ scale: 0.96, filter: "blur(8px)", transition: { duration: 0.18 } }}
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
                                {last ? "Explore V-Menu" : index === 0 ? "Start the tour" : "Next"}
                            </button>
                        </div>
                    </footer>
                </motion.div>
            </motion.div>
        </MotionConfig>
    );
}
