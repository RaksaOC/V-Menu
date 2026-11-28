"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import type { SceneId } from "@/content/tour";
import { BillCard } from "../mocks/BillCard";
import { KitchenBoard } from "../mocks/KitchenBoard";
import { PhoneMenu } from "../mocks/PhoneMenu";
import { RequestFeed } from "../mocks/RequestFeed";
import { SalesChart } from "../mocks/SalesChart";
import { Locations, QrScan, SoldOut, TeamRoles } from "../mocks/SmallMocks";
import s from "./scenes.module.css";

// The picture for each tour step, built from the same product pictures as the landing page.

const Phone = ({ table }: { table?: string }) => (
    <div className={s.phone}>
        <PhoneMenu table={table} />
    </div>
);

function Welcome() {
    return (
        <div className={s.welcome}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <Phone />
            </motion.div>
            <motion.div className={s.welcomeQr} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <QrScan />
            </motion.div>
            <motion.div
                className={s.welcomeBill}
                initial={{ x: 16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <BillCard />
            </motion.div>
        </div>
    );
}

const Scan = () => (
    <div className={s.pair}>
        <div className={s.stack}>
            <QrScan />
            <span className={s.caption}>Table 4</span>
        </div>
        <Phone />
    </div>
);

const Order = () => (
    <div className={s.pair}>
        <Phone table="Table 2" />
        <SoldOut />
    </div>
);

const Kitchen = () => (
    <div className={s.board}>
        <KitchenBoard />
    </div>
);

const Requests = () => (
    <div className={s.stack}>
        <RequestFeed />
        <span className={s.caption}>What your cashier sees</span>
    </div>
);

const Bill = () => (
    <div className={s.stack}>
        <BillCard />
    </div>
);

const Owner = () => (
    <div className={s.stack}>
        <SalesChart />
        <Locations />
    </div>
);

const Team = () => (
    <div className={s.stack}>
        <TeamRoles />
    </div>
);

const ACTIONS = [
    { href: "/signup", title: "Create your restaurant", sub: "Free to start, ready in minutes", primary: true },
    { href: "/login", title: "Log in", sub: "For owners and staff" },
];

function Start() {
    return (
        <div className={s.actions}>
            {ACTIONS.map((a) => (
                <Link key={a.href} href={a.href} className={`${s.action} ${a.primary ? s.actionPrimary : ""}`}>
                    <span>
                        <strong>{a.title}</strong>
                        <span>{a.sub}</span>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                </Link>
            ))}
        </div>
    );
}

export const SCENES: Record<SceneId, ComponentType> = {
    welcome: Welcome,
    scan: Scan,
    order: Order,
    kitchen: Kitchen,
    requests: Requests,
    bill: Bill,
    owner: Owner,
    team: Team,
    start: Start,
};
