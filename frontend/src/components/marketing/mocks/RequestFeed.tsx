"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { REQUESTS } from "./mock-data";
import s from "./mocks.module.css";
import { useTicker } from "./use-ticker";

/** Guests calling the staff from their phones: a new request rings in every few seconds. */
export function RequestFeed({ show = 3 }: { show?: number }) {
    const tick = useTicker(2200, show - 1);
    const visible = Array.from({ length: show }, (_, i) => tick - i);

    return (
        <div className={s.requests}>
            <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((k, i) => {
                    const r = REQUESTS[k % REQUESTS.length];
                    return (
                        <motion.div
                            key={k}
                            layout
                            className={s.request}
                            initial={{ y: -16, scale: 0 }}
                            animate={{ y: 0, scale: 1 - i * 0.04 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 26 }}
                        >
                            <motion.span
                                className={s.bell}
                                animate={i === 0 ? { rotate: [0, -16, 14, -10, 6, 0] } : { rotate: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <BellRing size={15} aria-hidden="true" />
                            </motion.span>
                            <span>
                                <strong>{r.table}</strong> {r.text}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
