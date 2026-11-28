"use client";

import { animate, motion, useInView } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import s from "./mocks.module.css";

const WEEK = [38, 52, 44, 61, 57, 86, 74];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** A week of sales that grows into view, with the total counting up. */
export function SalesChart() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    const [shown, setShown] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const controls = animate(0, 2940, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
        return () => controls.stop();
    }, [inView]);

    return (
        <div ref={ref} className={`${s.surface} ${s.chart}`}>
            <div className={s.chartTop}>
                <div>
                    <span className={s.label}>Sales this week</span>
                    <div className={s.big}>${shown.toLocaleString("en-US")}</div>
                </div>
                <span className={s.up}>
                    <TrendingUp size={13} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Busiest: Saturday
                </span>
            </div>
            <div className={s.bars}>
                {WEEK.map((h, i) => (
                    <motion.div
                        key={i}
                        className={`${s.bar} ${i === 5 ? "" : s.barMuted}`}
                        style={{ height: `${h}%` }}
                        initial={{ scaleY: 0 }}
                        animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
                        transition={{ delay: 0.08 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                ))}
            </div>
            <div className={s.days}>
                {DAYS.map((d, i) => (
                    <span key={i} className={s.label}>
                        {d}
                    </span>
                ))}
            </div>
        </div>
    );
}
