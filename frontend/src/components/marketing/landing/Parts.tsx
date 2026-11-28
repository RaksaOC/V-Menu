"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "../LogoMark";
import s from "./landing.module.css";
import { inView, reveal } from "./motion";

/** The V-Menu mark and name, linking to the top of the page. */
export function Logo() {
    return (
        <Link href="/" className={s.logo} aria-label="V-Menu home">
            <LogoMark size={36} className={s.logoMark} />
            <span className={s.logoText}>V-Menu</span>
        </Link>
    );
}

/** A section's big heading, revealed as it scrolls in. */
export function SectionHead({ id, title, center = false }: { id: string; title: ReactNode; center?: boolean }) {
    return (
        <motion.div className={`${s.head} ${center ? s.headCenter : ""}`} variants={reveal} {...inView}>
            <h2 id={id} className={s.h2}>
                {title}
            </h2>
        </motion.div>
    );
}
