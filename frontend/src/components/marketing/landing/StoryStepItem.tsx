"use client";

import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import s from "./landing.module.css";
import { ease } from "./motion";
import type { StoryStep } from "./StorySteps";

/** One step of the story. It says when it reaches the middle of the screen, so the picture can follow. */
export function StoryStepItem({ step, index, active, onReach }: { step: StoryStep; index: number; active: number; onReach: () => void }) {
    const ref = useRef<HTMLElement>(null);
    const centred = useInView(ref, { margin: "-48% 0px -48% 0px" });
    const reach = useRef(onReach);
    reach.current = onReach;
    useEffect(() => {
        if (centred) reach.current();
    }, [centred]);

    return (
        <article ref={ref} className={`${s.step} ${index === active ? s.stepOn : ""}`}>
            <div className={s.stepNum}>
                <span>0{index + 1}</span>
                <span className={s.stepBar}>
                    <motion.span
                        className={s.stepFill}
                        initial={false}
                        animate={{ scaleX: index <= active ? 1 : 0 }}
                        transition={{ duration: 0.6, ease }}
                    />
                </span>
            </div>
            <div className={s.stepHead}>
                <span className={s.stepIcon}>
                    <step.icon size={22} aria-hidden="true" />
                </span>
                <h3 className={s.stepTitle}>{step.title}</h3>
            </div>
            <ul className={s.stepPoints}>
                {step.points.map((p) => (
                    <li key={p}>
                        <Check size={16} aria-hidden="true" />
                        {p}
                    </li>
                ))}
            </ul>
            <div className={s.inline} aria-hidden="true">
                {step.scene()}
            </div>
        </article>
    );
}
