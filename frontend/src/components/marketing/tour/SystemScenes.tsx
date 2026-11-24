"use client";

import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { Db } from "./Db";
import s from "./scenes.module.css";
import { SERVICES } from "./tour-data";
import { useTicker } from "./use-tour";

// Tour scenes 5 to 7: the architecture, who owns which data, and the calls behind one order.

/* ---------- 5 · architecture ---------- */

export function ArchitectureScene() {
    return (
        <div className={s.scene}>
            <div className={s.centerRow}>
                <span className={s.node}>
                    <UserRound size={16} /> Browser
                </span>
                <span className={s.arrow}>→</span>
                <span className={`${s.node} ${s.nodeDark}`}>
                    Next.js <span className={s.small}>pages + /api rewrites</span>
                </span>
            </div>
            <div className={s.fan} aria-hidden="true">
                <span />
                <span />
                <span />
            </div>
            <div className={s.three}>
                {SERVICES.map((svc, i) => (
                    <motion.div
                        key={svc.id}
                        className={s.svc}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                    >
                        <strong>{svc.name}</strong>
                        <code className={s.small}>:{svc.port}</code>
                        <div className={s.pathList}>
                            {svc.paths.map((p) => (
                                <code key={p}>{p}</code>
                            ))}
                        </div>
                        <Db name={svc.db} />
                    </motion.div>
                ))}
            </div>
            <div className={s.chips}>
                <span className={`${s.chip} ${s.chipAccent}`}>menu → restaurant</span>
                <span className={`${s.chip} ${s.chipAccent}`}>order → restaurant</span>
                <span className={`${s.chip} ${s.chipAccent}`}>order → menu</span>
                <span className={s.chip}>internal REST + shared key</span>
            </div>
        </div>
    );
}

/* ---------- 6 · data ownership ---------- */

const ANSWERS: Record<string, string[]> = {
    restaurant: ["sign-up and sign-in", "which restaurants an owner has", "staff for a restaurant"],
    menu: ["the customer menu", "is table 4 open?", "real price of each dish"],
    order: ["place an order", "kitchen queue and bills", "dashboard numbers"],
};

export function OwnershipScene() {
    return (
        <div className={s.three}>
            {SERVICES.map((svc, i) => (
                <motion.div
                    key={svc.id}
                    className={s.svc}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <strong>{svc.name}</strong>
                    <Db name={svc.db} />
                    <div className={s.label}>Collections</div>
                    <div className={s.chips}>
                        {svc.owns.map((c) => (
                            <span key={c} className={`${s.chip} ${s.chipOk}`}>
                                {c}
                            </span>
                        ))}
                    </div>
                    <div className={s.label}>Answers</div>
                    <ul className={s.miniList}>
                        {ANSWERS[svc.id].map((a) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                </motion.div>
            ))}
        </div>
    );
}

/* ---------- 7 · order call chain (sequence diagram) ---------- */

const LANES = ["Browser", "order", "restaurant", "menu"];
const CALLS = [
    { from: 0, to: 1, text: "POST /api/orders/mee-keav-x1y2" },
    { from: 1, to: 2, text: "GET /internal/restaurants/by-slug/…" },
    { from: 2, to: 1, text: "{ _id, ownerId }", back: true },
    { from: 1, to: 3, text: "POST /internal/…/order-check" },
    { from: 3, to: 1, text: "table open, prices", back: true },
    { from: 1, to: 1, text: "save order + add to bill" },
    { from: 1, to: 0, text: "201 Created", back: true },
];

export function OrderScene() {
    const at = useTicker(CALLS.length + 2, 1100);
    const W = 560;
    const x = (lane: number) => 60 + lane * ((W - 120) / 3);
    const rowY = (i: number) => 64 + i * 40;
    return (
        <div className={s.scene}>
            <div className={s.svgScroll}>
                <svg viewBox={`0 0 ${W} 360`} className={s.svg} role="img" aria-label="Sequence of service calls when an order is placed">
                    <defs>
                        <marker
                            id="seq-arrow"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="7"
                            markerHeight="7"
                            orient="auto-start-reverse"
                        >
                            <path d="M0,0L10,5L0,10z" fill="var(--muted)" />
                        </marker>
                    </defs>
                    {LANES.map((l, i) => (
                        <g key={l}>
                            <rect x={x(i) - 52} y={8} width={104} height={30} rx={8} fill="var(--bg)" stroke="var(--line)" />
                            <text x={x(i)} y={28} textAnchor="middle" fontSize="12.5" fontWeight={600} fill="var(--ink)">
                                {i === 0 ? l : `${l}-svc`}
                            </text>
                            <line x1={x(i)} y1={38} x2={x(i)} y2={350} stroke="var(--line)" strokeDasharray="4 4" />
                        </g>
                    ))}
                    {CALLS.map((c, i) => {
                        const shown = i < at;
                        const y = rowY(i);
                        const self = c.from === c.to;
                        return (
                            <g key={i} style={{ opacity: shown ? 1 : 0.12, transition: "opacity .35s" }}>
                                {self ? (
                                    <rect x={x(c.from) - 6} y={y - 12} width={12} height={22} rx={3} fill="var(--accent)" />
                                ) : (
                                    <line
                                        x1={x(c.from)}
                                        y1={y}
                                        x2={x(c.to) + (c.to > c.from ? -4 : 4)}
                                        y2={y}
                                        stroke={c.back ? "var(--muted)" : "var(--accent)"}
                                        strokeWidth={1.8}
                                        strokeDasharray={c.back ? "5 4" : undefined}
                                        markerEnd="url(#seq-arrow)"
                                    />
                                )}
                                <text
                                    x={self ? x(c.from) + 14 : (x(c.from) + x(c.to)) / 2}
                                    y={self ? y + 4 : y - 7}
                                    textAnchor={self ? "start" : "middle"}
                                    fontSize="11"
                                    fontFamily="var(--f-mono)"
                                    fill="var(--ink)"
                                >
                                    {c.text}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className={s.chips}>
                <span className={s.chip}>x-request-id: 7f3c…a91e</span>
                <span className={`${s.chip} ${s.chipMuted}`}>same id in all three logs</span>
            </div>
        </div>
    );
}
