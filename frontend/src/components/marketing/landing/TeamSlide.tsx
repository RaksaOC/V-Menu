"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check } from "lucide-react";
import s from "./landing.module.css";
import type { Role } from "./TeamRoles";

/** One role's screen in the sideways team strip. It eases back a little while it is off to the side. */
export function TeamSlide({ role, index, position }: { role: Role; index: number; position: MotionValue<number> }) {
    const away = useTransform(position, (p) => Math.min(Math.abs(p - index), 1));
    const scale = useTransform(away, (a) => 1 - a * 0.06);

    return (
        <article className={s.teamSlide} aria-label={role.name}>
            <div className={`${s.container} ${s.teamPanel}`}>
                <div className={s.teamCopy}>
                    <span className={s.teamRole}>
                        <role.icon size={16} aria-hidden="true" /> {role.name}
                    </span>
                    <h3>{role.headline}</h3>
                    <ul className={s.stepPoints}>
                        {role.points.map((p) => (
                            <li key={p}>
                                <Check size={16} aria-hidden="true" />
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
                <motion.div className={s.teamArt} style={{ scale }}>
                    {role.art}
                </motion.div>
            </div>
        </article>
    );
}
