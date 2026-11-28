"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import s from "./landing.module.css";
import { inView, reveal, stagger } from "./motion";

const STATS = [
    { value: 5, unit: "sec", text: "from table to kitchen" },
    { value: 0, unit: "apps", text: "for guests to download" },
    { value: 1, unit: "bill", text: "per table, every round" },
    { value: 4, unit: "screens", text: "one system" },
];

/** A number that counts up from zero the first time it scrolls into view. */
function CountUp({ to }: { to: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const seen = useInView(ref, { once: true });
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!seen) return;
        const controls = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
        return () => controls.stop();
    }, [seen, to]);
    return <span ref={ref}>{n}</span>;
}

/** The product's promises, in numbers. */
export function Stats() {
    return (
        <section className={s.container} aria-label="V-Menu in numbers">
            <motion.div className={s.stats} variants={stagger} {...inView}>
                {STATS.map((st) => (
                    <motion.div key={st.unit} className={s.stat} variants={reveal}>
                        <span className={s.statNum}>
                            <CountUp to={st.value} />
                            <small>{st.unit}</small>
                        </span>
                        <p className={s.statText}>{st.text}</p>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}
