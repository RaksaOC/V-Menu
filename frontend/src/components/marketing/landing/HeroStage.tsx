"use client";

import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { BellRing } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { BillCard } from "../mocks/BillCard";
import { KitchenBoard } from "../mocks/KitchenBoard";
import { PhoneMenu } from "../mocks/PhoneMenu";
import s from "./landing.module.css";
import { ease } from "./motion";

const spring = { stiffness: 120, damping: 20, mass: 0.6 };

/**
 * The hero picture: the kitchen screen in a browser, a guest's phone in front of it and the
 * table's bill beside it. It tilts toward the pointer and the pieces drift apart as you scroll.
 */
export function HeroStage() {
    const ref = useRef<HTMLDivElement>(null);
    const px = useMotionValue(0);
    const py = useMotionValue(0);
    const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), spring);
    const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), spring);

    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const phoneY = useTransform(scrollYProgress, [0, 1], [60, -70]);
    const billY = useTransform(scrollYProgress, [0, 1], [90, -110]);
    const toastY = useTransform(scrollYProgress, [0, 1], [40, -40]);

    const onMove = (e: MouseEvent<HTMLDivElement>) => {
        const box = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - box.left) / box.width - 0.5);
        py.set((e.clientY - box.top) / box.height - 0.5);
    };
    const onLeave = () => {
        px.set(0);
        py.set(0);
    };

    return (
        <motion.div
            ref={ref}
            className={s.stageWrap}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1.1, ease }}
            role="img"
            aria-label="V-Menu at work: a guest adds dishes on their phone, the order appears on the kitchen screen, and the table's bill adds up and is paid."
        >
            <motion.div className={s.stageTilt} style={{ rotateX, rotateY }}>
                <div className={s.browser}>
                    <div className={s.chrome}>
                        <i />
                        <i />
                        <i />
                        <span className={s.address}>Kitchen screen</span>
                    </div>
                    <KitchenBoard />
                </div>

                <motion.div className={s.stagePhone} style={{ y: phoneY }}>
                    <PhoneMenu />
                </motion.div>

                <motion.div
                    className={s.flyer}
                    aria-hidden="true"
                    animate={{ x: [0, 90, 170, 170], y: [0, -150, -250, -250], opacity: [0, 1, 1, 0], scale: [0.7, 1, 0.85, 0.85] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.85, 1] }}
                >
                    New order · Table 4
                </motion.div>

                <motion.div className={s.stageBill} style={{ y: billY }}>
                    <BillCard />
                </motion.div>

                <motion.div className={s.stageToast} style={{ y: toastY }}>
                    <span className={s.toastIcon}>
                        <BellRing size={15} />
                    </span>
                    Table 7 asked for the bill
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
