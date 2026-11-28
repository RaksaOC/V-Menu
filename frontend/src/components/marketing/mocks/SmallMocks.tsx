"use client";

import { motion } from "framer-motion";
import { Store } from "lucide-react";
import Image from "next/image";
import { DISHES } from "./mock-data";
import s from "./mocks.module.css";
import { useTicker } from "./use-ticker";

/** A table's printed QR code with a scanning line passing over it. */
export function QrScan({ big = false }: { big?: boolean }) {
    return (
        <div className={`${s.qrWrap} ${big ? s.qrBig : ""}`}>
            <Image src="/images/qr.png" alt="" width={240} height={240} className={s.qrImg} />
            <motion.span
                className={s.beam}
                initial={{ top: "8%" }}
                animate={{ top: ["8%", "90%", "8%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

/** Dishes switched off and on mid-service: a sold-out dish disappears from every table's menu. */
export function SoldOut() {
    const off = useTicker(1800) % DISHES.length;
    return (
        <div className={s.rows}>
            {DISHES.slice(0, 3).map((d, i) => {
                const on = i !== off;
                return (
                    <div key={d.name} className={s.row}>
                        <Image src={d.img} alt="" width={68} height={68} className={s.rowImg} />
                        <span className={s.grow}>{d.name}</span>
                        <span className={`${s.pill} ${on ? s.pillOk : ""}`}>{on ? "On the menu" : "Sold out"}</span>
                        <span className={`${s.switch} ${on ? s.switchOn : s.switchOff}`}>
                            <motion.span layout className={s.knob} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const ROLES = [
    { who: "Sophea", role: "Owner", sees: "Everything, every location", color: "#ff9d85" },
    { who: "Dara", role: "Cashier", sees: "Tables, bills, menu switches", color: "#9fd8c6" },
    { who: "Vanna", role: "Chef", sees: "The kitchen screen", color: "#ffd58a" },
];

/** Each person on the team, with what their own sign-in shows them. */
export function TeamRoles() {
    return (
        <div className={s.rows}>
            {ROLES.map((r, i) => (
                <motion.div
                    key={r.role}
                    className={s.row}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                >
                    <span className={s.avatar} style={{ background: r.color }}>
                        {r.who[0]}
                    </span>
                    <span className={s.grow}>
                        <strong>{r.who}</strong>
                        <br />
                        <span className={s.label}>{r.sees}</span>
                    </span>
                    <span className={s.pill}>{r.role}</span>
                </motion.div>
            ))}
        </div>
    );
}

const PLACES = ["Mee Keav · Riverside", "Mee Keav · BKK1", "Noodle Lab · Toul Kork"];

/** One account switching between several restaurants. */
export function Locations() {
    const at = useTicker(1900) % PLACES.length;
    return (
        <div className={s.rows}>
            {PLACES.map((p, i) => (
                <div key={p} className={`${s.row} ${i === at ? s.selected : ""}`}>
                    <Store size={16} aria-hidden="true" />
                    <span className={s.grow}>{p}</span>
                    {i === at && <span className={`${s.pill} ${s.pillOk}`}>Open now</span>}
                </div>
            ))}
        </div>
    );
}
