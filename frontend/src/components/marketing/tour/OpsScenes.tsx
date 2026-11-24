"use client";

import { motion } from "framer-motion";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import s from "./scenes.module.css";
import { SERVICES } from "./tour-data";
import { useServiceHealth } from "./use-tour";

// Tour scenes 8 to 10: security, live health, and how to try it.

/* ---------- 8 · security ---------- */

const CHAIN = [
    { icon: UserRound, title: "Firebase sign-in", sub: "email + password, in the browser" },
    { icon: KeyRound, title: "ID token", sub: "RS256, signed by Google" },
    { icon: ShieldCheck, title: "restaurant-service", sub: "checks it with Google's keys" },
    { icon: KeyRound, title: "App token", sub: "HS256 · 1 hour · one role" },
];

export function SecurityScene() {
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

export function HealthScene() {
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

export function TryScene() {
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
