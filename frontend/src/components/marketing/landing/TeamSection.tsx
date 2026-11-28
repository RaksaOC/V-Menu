"use client";

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState, type CSSProperties } from "react";
import s from "./landing.module.css";
import { ease } from "./motion";
import { SectionHead } from "./Parts";
import { ROLES } from "./TeamRoles";
import { TeamSlide } from "./TeamSlide";

const COUNT = ROLES.length;

/** Scroll progress (0 to 1) to a slide position. Each role rests briefly, then eases gently to the next. */
function settle(progress: number) {
    const along = Math.min(Math.max(progress, 0), 1) * (COUNT - 1);
    const from = Math.min(Math.floor(along), COUNT - 2);
    const t = Math.min(Math.max((along - from - 0.1) / 0.8, 0), 1);
    return from + (1 - Math.cos(Math.PI * t)) / 2;
}

/**
 * One screen per person on the team. On wide screens the section pins in place and scrolling
 * slides sideways from role to role; on phones the roles simply stack.
 */
export function TeamSection() {
    const ref = useRef<HTMLElement>(null);
    const [at, setAt] = useState(0);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
    // The spring irons out the steps of a mouse wheel, so the strip glides rather than jumps.
    const position = useSpring(useTransform(scrollYProgress, settle), { stiffness: 90, damping: 24, mass: 0.6, restDelta: 0.0005 });
    const x = useTransform(position, (p) => `${(-p * 100) / COUNT}%`);
    useMotionValueEvent(position, "change", (p) => setAt(Math.round(p)));

    // A tab scrolls the page to the point where its role sits still in the middle.
    const goTo = (i: number) => {
        const el = ref.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        const room = el.offsetHeight - window.innerHeight;
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: top + (room * i) / (COUNT - 1), behavior: calm ? "auto" : "smooth" });
    };

    return (
        <section ref={ref} id="team" className={s.team} style={{ "--n": COUNT } as CSSProperties} aria-labelledby="team-title">
            <div className={s.teamPin}>
                <div className={`${s.container} ${s.teamTop}`}>
                    <SectionHead id="team-title" title="A screen for everyone." center />
                    <nav aria-label="Who uses V-Menu" className={s.tabs}>
                        {ROLES.map((r, i) => (
                            <button
                                key={r.id}
                                type="button"
                                aria-current={i === at ? "step" : undefined}
                                className={`${s.tab} ${i === at ? s.tabOn : ""}`}
                                onClick={() => goTo(i)}
                            >
                                {i === at && (
                                    <motion.span layoutId="team-pill" className={s.tabPill} transition={{ duration: 0.4, ease }} />
                                )}
                                <span className={s.tabLabel}>
                                    <r.icon size={16} aria-hidden="true" /> {r.name}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>
                <div className={s.teamWindow}>
                    <motion.div className={s.teamTrack} style={{ x }}>
                        {ROLES.map((role, i) => (
                            <TeamSlide key={role.id} role={role} index={i} position={position} />
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
