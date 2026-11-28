"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Printer } from "lucide-react";
import { money } from "./mock-data";
import s from "./mocks.module.css";
import { useTicker } from "./use-ticker";

const ROUNDS = [
    [
        { name: "2× Fish amok", price: 9 },
        { name: "1× Kuy teav", price: 2.5 },
    ],
    [{ name: "2× Iced coffee", price: 3 }],
];
const STEPS = 4; // round 1, round 2, total, paid

/** One table's bill: every round of orders adds to it, then it's paid. */
export function BillCard({ table = "Table 4" }: { table?: string }) {
    const step = useTicker(1500) % STEPS;
    const rounds = ROUNDS.slice(0, Math.min(step + 1, ROUNDS.length));
    const total = rounds.flat().reduce((sum, l) => sum + l.price, 0);
    const paid = step === STEPS - 1;

    return (
        <div className={`${s.surface} ${s.bill}`}>
            <div className={s.billHead}>
                <strong>{table}</strong>
                <span className={`${s.pill} ${paid ? s.pillOk : ""}`}>{paid ? "Paid" : "Open bill"}</span>
            </div>
            <AnimatePresence initial={false}>
                {rounds.map((round, r) => (
                    <motion.div
                        key={r}
                        className={s.round}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <span className={s.label}>Round {r + 1}</span>
                        {round.map((l) => (
                            <div key={l.name} className={s.line}>
                                <span>{l.name}</span>
                                <span>{money(l.price)}</span>
                            </div>
                        ))}
                    </motion.div>
                ))}
            </AnimatePresence>
            <div className={s.total}>
                <span>Total</span>
                <span>{money(total)}</span>
            </div>
            <span className={s.label} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Printer size={13} aria-hidden="true" /> Receipt prints in one tap
            </span>
            <AnimatePresence>
                {paid && (
                    <motion.span
                        className={s.stamp}
                        initial={{ opacity: 0, scale: 1.8, rotate: -12, x: "-50%" }}
                        animate={{ opacity: 1, scale: 1, rotate: -12, x: "-50%" }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                        PAID
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
}
