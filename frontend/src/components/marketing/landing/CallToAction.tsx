"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DISHES } from "../mocks/mock-data";
import s from "./landing.module.css";
import { inView, reveal, stagger } from "./motion";

// Where each floating dish sits around the panel.
const SPOTS = [
    { top: "12%", left: "6%" },
    { top: "62%", left: "10%" },
    { top: "14%", right: "7%" },
    { top: "60%", right: "5%" },
];

/** The closing invitation, on a forest-green panel with dishes drifting around it. */
export function CallToAction() {
    return (
        <section className={s.section} aria-labelledby="cta-title">
            <div className={s.container}>
                <motion.div className={s.cta} variants={stagger} {...inView}>
                    <div className={s.ctaGlow} aria-hidden="true" />
                    <div className={s.ctaGrid} aria-hidden="true" />
                    {DISHES.map((d, i) => (
                        <motion.div
                            key={d.name}
                            aria-hidden="true"
                            style={{ position: "absolute", zIndex: -1, ...SPOTS[i] }}
                            animate={{ y: [0, i % 2 ? 14 : -14, 0], rotate: [0, i % 2 ? -4 : 4, 0] }}
                            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Image src={d.img} alt="" width={120} height={120} className={s.orbit} style={{ position: "static" }} />
                        </motion.div>
                    ))}
                    <motion.h2 id="cta-title" variants={reveal}>
                        Open your first table tonight.
                    </motion.h2>
                    <motion.div className={s.ctaRow} variants={reveal}>
                        <Link href="/signup" className={`${s.btn} ${s.ctaPrimary}`}>
                            Create your restaurant <ArrowRight size={18} className={s.arrow} aria-hidden="true" />
                        </Link>
                        <Link href="/login" className={`${s.btnGhost} ${s.ctaGhost}`}>
                            I already have an account
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
