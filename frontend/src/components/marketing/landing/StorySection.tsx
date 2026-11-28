"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import s from "./landing.module.css";
import { ease } from "./motion";
import { SectionHead } from "./Parts";
import { StoryStepItem } from "./StoryStepItem";
import { STORY } from "./StorySteps";

/**
 * How it works, told while you scroll: the steps scroll past on the left while the picture on
 * the right stays put and changes with them. On small screens each step carries its own picture.
 */
export function StorySection() {
    const [active, setActive] = useState(0);
    const Scene = STORY[active].scene;

    return (
        <section id="how" className={s.section} aria-labelledby="how-title">
            <div className={s.container}>
                <SectionHead id="how-title" title="Scan. Order. Eat. Pay." />
                <div className={s.story}>
                    <div>
                        {STORY.map((step, i) => (
                            <StoryStepItem key={step.title} step={step} index={i} active={active} onReach={() => setActive(i)} />
                        ))}
                    </div>
                    <div className={s.sticky} aria-hidden="true">
                        <div className={s.stage}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={active}
                                    className={s.stageScene}
                                    initial={{ scale: 0.6, y: 30, filter: "blur(10px)" }}
                                    animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ scale: 0.6, y: -20, filter: "blur(10px)" }}
                                    transition={{ duration: 0.5, ease }}
                                >
                                    <Scene />
                                </motion.div>
                            </AnimatePresence>
                            <div className={s.dots}>
                                {STORY.map((step, i) => (
                                    <span key={step.title} className={`${s.dot} ${i === active ? s.dotOn : ""}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
