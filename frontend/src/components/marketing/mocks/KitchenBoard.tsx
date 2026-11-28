"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChefHat } from "lucide-react";
import { useId } from "react";
import { RESTAURANT, TICKETS } from "./mock-data";
import s from "./mocks.module.css";
import { useTicker } from "./use-ticker";

const COLUMNS = ["New", "Cooking", "Ready"] as const;
const AGES = ["Just now", "1 min", "4 min", "6 min", "9 min", "11 min"];

/**
 * The kitchen screen. A new order arrives every couple of seconds and the older ones move along:
 * order k is "New" for two ticks, then "Cooking", then "Ready", then leaves the board.
 */
export function KitchenBoard({ compact = false }: { compact?: boolean }) {
    const tick = useTicker(2000, 5);
    const group = useId();
    const live = Array.from({ length: 6 }, (_, i) => tick - i).filter((k) => k >= 0);

    return (
        <div className={s.board}>
            <div className={s.boardHead}>
                <strong>
                    <ChefHat size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} aria-hidden="true" />
                    Kitchen · {RESTAURANT}
                </strong>
                <span className={s.live}>
                    <span className={s.liveDot} />
                    Live
                </span>
            </div>
            <LayoutGroup id={group}>
                <div className={s.cols}>
                    {COLUMNS.map((col, c) => {
                        const here = live.filter((k) => Math.floor((tick - k) / 2) === c).slice(0, 2);
                        return (
                            <div key={col} className={s.col}>
                                <div className={s.colHead}>
                                    <span className={s.label}>{col}</span>
                                    <span className={s.count}>{here.length}</span>
                                </div>
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {here.map((k) => {
                                        const t = TICKETS[k % TICKETS.length];
                                        return (
                                            <motion.div
                                                key={k}
                                                layoutId={`${group}-${k}`}
                                                className={s.ticket}
                                                initial={{ opacity: 0, y: -14, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.94 }}
                                                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                                            >
                                                <div className={s.ticketTop}>
                                                    <strong>{t.table}</strong>
                                                    <span className={s.ticketTime}>{AGES[tick - k] ?? ""}</span>
                                                </div>
                                                {t.items.map((item) => (
                                                    <span key={item}>{item}</span>
                                                ))}
                                                {t.note && !compact && <span className={s.ticketNote}>“{t.note}”</span>}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </LayoutGroup>
        </div>
    );
}
