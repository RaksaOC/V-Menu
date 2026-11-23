"use client";

import { motion } from "framer-motion";
import { ChefHat, Database, KeyRound, QrCode, Receipt, ShieldCheck, Store, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import type { SceneId } from "@/content/tour";
import s from "./scenes.module.css";

/* ---------- small helpers ---------- */

function useTicker(count: number, ms = 1600) {
    const [i, setI] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setI((n) => (n + 1) % count), ms);
        return () => window.clearInterval(id);
    }, [count, ms]);
    return i;
}

type Health = "checking" | "up" | "down";
export function useServiceHealth(ms = 6000) {
    const [state, setState] = useState<Record<string, Health>>({ restaurant: "checking", menu: "checking", order: "checking" });
    useEffect(() => {
        let alive = true;
        const check = () =>
            Promise.all(
                ["restaurant", "menu", "order"].map(async (name) => {
                    try {
                        const res = await fetch(`/api/health/${name}`, { cache: "no-store" });
                        return [name, res.ok ? "up" : "down"] as const;
                    } catch {
                        return [name, "down"] as const;
                    }
                }),
            ).then((pairs) => alive && setState(Object.fromEntries(pairs)));
        check();
        const id = window.setInterval(check, ms);
        return () => {
            alive = false;
            window.clearInterval(id);
        };
    }, [ms]);
    return state;
}

const DISHES = [
    { name: "Fish amok", price: 4.5, img: "/images/tour/amok.jpg" },
    { name: "Kuy teav", price: 2.5, img: "/images/tour/kuy-teav.jpg" },
    { name: "Beef lok lak", price: 5, img: "/images/tour/lok-lak.jpg" },
    { name: "Num banh chok", price: 2, img: "/images/tour/num-banh-chok.jpg" },
];

const SERVICES = [
    {
        id: "restaurant",
        name: "restaurant-service",
        port: 4101,
        paths: ["/api/auth", "/api/restaurants", "/api/staff"],
        db: "vmenu_restaurants",
        owns: ["restaurants", "tenants"],
    },
    { id: "menu", name: "menu-service", port: 4102, paths: ["/api/menu"], db: "vmenu_menu", owns: ["items", "tables"] },
    { id: "order", name: "order-service", port: 4103, paths: ["/api/orders"], db: "vmenu_orders", owns: ["orders", "table_orders"] },
];

function Db({ name }: { name: string }) {
    return (
        <span className={s.db}>
            <Database size={14} aria-hidden="true" />
            <code>{name.replace("_", "_\u200b")}</code>
        </span>
    );
}

/* ---------- 1 · intro: the customer's phone ---------- */

function IntroScene() {
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

function RolesScene() {
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

function FlowScene() {
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

function BeforeScene() {
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

/* ---------- 5 · architecture ---------- */

function ArchitectureScene() {
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

function OwnershipScene() {
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

function OrderScene() {
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

/* ---------- 8 · security ---------- */

const CHAIN = [
    { icon: UserRound, title: "Firebase sign-in", sub: "email + password, in the browser" },
    { icon: KeyRound, title: "ID token", sub: "RS256, signed by Google" },
    { icon: ShieldCheck, title: "restaurant-service", sub: "checks it with Google's keys" },
    { icon: KeyRound, title: "App token", sub: "HS256 · 1 hour · one role" },
];

function SecurityScene() {
    return (
        <div className={s.scene}>
            <div className={s.chain}>
                {CHAIN.map((c, i) => (
                    <motion.div
                        key={c.title}
                        className={s.chainItem}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.12 }}
                    >
                        <c.icon size={16} />
                        <strong>{c.title}</strong>
                        <span className={s.small}>{c.sub}</span>
                    </motion.div>
                ))}
            </div>
            <pre className={s.code}>{`{
  "uid": "9QxcZnO9…",
  "email": "cashier@meekeav.com",
  "role": "cashier",
  "resId": "682ffb55f3b75bda48192a81",
  "resSlug": "mee-keav-x1y2",
  "exp": 1794810000
}`}</pre>
            <div className={s.chips}>
                <span className={`${s.chip} ${s.chipOk}`}>role allowed?</span>
                <span className={`${s.chip} ${s.chipOk}`}>same restaurant?</span>
                <span className={`${s.chip} ${s.chipOk}`}>$-operators stripped</span>
                <span className={`${s.chip} ${s.chipOk}`}>rate-limited sign-in</span>
            </div>
        </div>
    );
}

/* ---------- 9 · health (live) ---------- */

function HealthScene() {
    const health = useServiceHealth();
    return (
        <div className={s.scene}>
            <div className={s.three}>
                {SERVICES.map((svc) => {
                    const h = health[svc.id];
                    return (
                        <div key={svc.id} className={s.svc}>
                            <strong>{svc.name}</strong>
                            <span className={`${s.status} ${h === "up" ? s.statusUp : h === "down" ? s.statusDown : ""}`}>
                                <span className={s.dot} />
                                {h === "up" ? "healthy" : h === "down" ? "not running" : "checking…"}
                            </span>
                            <code className={s.small}>GET /api/health/{svc.id}</code>
                        </div>
                    );
                })}
            </div>
            <div className={s.label}>Live from this page. Start the services and the dots turn green.</div>
            <pre
                className={s.code}
            >{`{"level":30,"service":"order-service","req":{"id":"7f3c…a91e","method":"POST","url":"/api/orders/mee-keav-x1y2"},"msg":"order placed","table":"4","lines":2}
{"level":30,"service":"menu-service","req":{"id":"7f3c…a91e","method":"POST","url":"/internal/…/order-check"},"res":{"statusCode":200},"responseTime":11}`}</pre>
            <pre className={s.code}>{`http_request_duration_seconds_count{method="POST",route="/api/orders/:slug/",status="201"} 42
process_resident_memory_bytes 71303168`}</pre>
        </div>
    );
}

/* ---------- 10 · try it ---------- */

const ACTIONS = [
    { href: "/signup", title: "Create a restaurant", sub: "owner sign-up" },
    { href: "/login", title: "Log in", sub: "pick a restaurant and role" },
    { href: "/owner/login", title: "Owner dashboard", sub: "menus, tables, staff" },
];
const STACK = [
    "Next.js 15",
    "Express 5",
    "TypeScript",
    "MongoDB + Mongoose",
    "Firebase Auth",
    "jose (JWT)",
    "pino logs",
    "prom-client",
    "Vitest + Supertest",
];

function TryScene() {
    return (
        <div className={s.scene}>
            <div className={s.three}>
                {ACTIONS.map((a) => (
                    <Link key={a.href} href={a.href} className={s.action}>
                        <strong>{a.title}</strong>
                        <span className={s.small}>{a.sub}</span>
                        <span className={s.actionArrow}>→</span>
                    </Link>
                ))}
            </div>
            <div className={s.label}>Built with</div>
            <div className={s.chips}>
                {STACK.map((t) => (
                    <span key={t} className={s.chip}>
                        {t}
                    </span>
                ))}
            </div>
            <pre className={s.code}>{`npm run dev     # from the repo root: 3 services + the frontend`}</pre>
        </div>
    );
}

export const SCENES: Record<SceneId, ComponentType> = {
    intro: IntroScene,
    roles: RolesScene,
    flow: FlowScene,
    before: BeforeScene,
    architecture: ArchitectureScene,
    ownership: OwnershipScene,
    order: OrderScene,
    security: SecurityScene,
    health: HealthScene,
    try: TryScene,
};
