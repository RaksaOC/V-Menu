"use client";

import { motion } from "framer-motion";
import { ChefHat, QrCode, Receipt, Store } from "lucide-react";
import Image from "next/image";
import { Db } from "./Db";
import s from "./scenes.module.css";
import { DISHES } from "./tour-data";
import { useTicker } from "./use-tour";

// Tour scenes 1 to 4: the customer's phone, the roles, the order flow, and the app before the split.

/* ---------- 1 · intro: the customer's phone ---------- */

export function IntroScene() {
    return (
        <div className={s.introRow}>
            <motion.div className={s.phone} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <div className={s.phoneTop}>
                    <strong>Mee Keav</strong>
                    <span className={s.chip}>Table 4</span>
                </div>
                <div className={s.dishGrid}>
                    {DISHES.map((d, i) => (
                        <motion.div
                            key={d.name}
                            className={s.dish}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.08 }}
                        >
                            <Image src={d.img} alt={d.name} width={160} height={160} className={s.dishImg} />
                            <span className={s.dishName}>{d.name}</span>
                            <span className={s.dishPrice}>${d.price.toFixed(2)}</span>
                        </motion.div>
                    ))}
                </div>
                <div className={s.cartBar}>
                    <span>2 items · $7.00</span>
                    <span className={s.cartBtn}>Place order</span>
                </div>
            </motion.div>
            <motion.div className={s.qrCard} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Image src="/images/qr.png" alt="QR code printed on the table" width={140} height={140} className={s.qrImg} />
                <span className={s.label}>Scan at table 4</span>
                <code className={s.small}>/mee-keav-x1y2/customer/4</code>
            </motion.div>
        </div>
    );
}

/* ---------- 2 · roles ---------- */

const ROLES = [
    { icon: QrCode, name: "Customer", path: "/[res]/customer/[table]", uses: ["menu", "order"] },
    { icon: ChefHat, name: "Chef", path: "/[res]/kitchen", uses: ["order"] },
    { icon: Receipt, name: "Cashier", path: "/[res]/cashier/dashboard", uses: ["menu", "order"] },
    { icon: Store, name: "Owner", path: "/owner", uses: ["restaurant", "menu", "order"] },
];

export function RolesScene() {
    return (
        <div className={s.grid2}>
            {ROLES.map((r, i) => (
                <motion.div
                    key={r.name}
                    className={s.panel}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                >
                    <div className={s.roleHead}>
                        <span className={s.iconDot}>
                            <r.icon size={18} />
                        </span>
                        <strong>{r.name}</strong>
                    </div>
                    <code className={s.small}>{r.path}</code>
                    <div className={s.chips}>
                        {r.uses.map((u) => (
                            <span key={u} className={s.chip}>
                                {u}-service
                            </span>
                        ))}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

/* ---------- 3 · order flow ---------- */

const FLOW = [
    { who: "Cashier", what: "Opens table 4", call: "PATCH /api/menu/:slug/tables/:id/availability" },
    { who: "Customer", what: "Orders 2 dishes", call: "POST /api/orders/:slug" },
    { who: "Kitchen", what: "Sees the new order", call: "GET /api/orders/:slug/kitchen" },
    { who: "Chef", what: "Marks it done", call: "PATCH /api/orders/:slug/kitchen/:id/done" },
    { who: "Cashier", what: "Takes payment", call: "PATCH /api/orders/:slug/bills/:id" },
];

export function FlowScene() {
    const at = useTicker(FLOW.length, 1500);
    return (
        <div className={s.flow}>
            {FLOW.map((f, i) => (
                <div key={f.call} className={`${s.flowRow} ${i === at ? s.flowActive : ""} ${i < at ? s.flowDone : ""}`}>
                    <span className={s.flowNum}>{i + 1}</span>
                    <div className={s.flowText}>
                        <strong>
                            {f.who}: {f.what}
                        </strong>
                        <code className={s.small}>{f.call}</code>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ---------- 4 · before: the monolith ---------- */

const OLD_ROUTES = [
    { dir: "api/owner/", n: 12 },
    { dir: "api/cashier/", n: 8 },
    { dir: "api/kitchen/", n: 3 },
    { dir: "api/customer/", n: 2 },
    { dir: "api/login, api/signup", n: 2 },
];

export function BeforeScene() {
    return (
        <div className={s.scene}>
            <div className={s.monolith}>
                <div className={s.label}>One Next.js process · port 3000</div>
                <div className={s.chips}>
                    <span className={s.chip}>pages</span>
                    <span className={s.chip}>middleware</span>
                </div>
                <div className={s.routeList}>
                    {OLD_ROUTES.map((r) => (
                        <div key={r.dir} className={s.routeItem}>
                            <code>{r.dir}</code>
                            <span className={s.small}>{r.n} routes</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className={s.arrowDown}>↓ every route</div>
            <div className={s.centerRow}>
                <Db name="v_menu (one Atlas database, 6 collections)" />
            </div>
            <div className={s.chips}>
                <span className={`${s.chip} ${s.chipBad}`}>password in db.ts</span>
                <span className={`${s.chip} ${s.chipBad}`}>JWT secret in 4 files</span>
                <span className={`${s.chip} ${s.chipBad}`}>uid trusted from browser</span>
                <span className={`${s.chip} ${s.chipBad}`}>no per-restaurant check</span>
            </div>
        </div>
    );
}
