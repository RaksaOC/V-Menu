"use client";

import { motion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { KitchenBoard } from "../mocks/KitchenBoard";
import { RequestFeed } from "../mocks/RequestFeed";
import { SalesChart } from "../mocks/SalesChart";
import { Locations, QrScan, SoldOut, TeamRoles } from "../mocks/SmallMocks";
import s from "./landing.module.css";
import { inView, reveal, stagger } from "./motion";
import { SectionHead } from "./Parts";

interface Tile {
    title: string;
    art: ReactNode;
    size?: "wide" | "half";
}

const TILES: Tile[] = [
    {
        title: "Live kitchen screen",
        art: (
            <div className={s.tileBoard}>
                <KitchenBoard compact />
            </div>
        ),
        size: "wide",
    },
    {
        title: "A QR code per table",
        art: <QrScan />,
    },
    {
        title: "Guests call you over",
        art: <RequestFeed />,
    },
    {
        title: "Sold out? Switch it off.",
        art: <SoldOut />,
    },
    {
        title: "A login for every role",
        art: <TeamRoles />,
    },
    {
        title: "Sales at a glance",
        art: <SalesChart />,
        size: "half",
    },
    {
        title: "Every location, one account",
        art: <Locations />,
        size: "half",
    },
];

/** Moves the hover spotlight to wherever the pointer is on the tile. */
function spotlight(e: MouseEvent<HTMLElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - box.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - box.top}px`);
}

/** The feature grid: each tile shows its feature working, not just a description. */
export function Bento() {
    return (
        <section id="features" className={s.section} aria-labelledby="features-title">
            <div className={s.container}>
                <SectionHead id="features-title" title="Everything the floor needs." center />
                <motion.div className={s.bento} variants={stagger} {...inView}>
                    {TILES.map((t) => (
                        <motion.article
                            key={t.title}
                            className={`${s.tile} ${t.size ? s[t.size] : ""}`}
                            variants={reveal}
                            onMouseMove={spotlight}
                        >
                            <div className={s.tileArt} aria-hidden="true">
                                {t.art}
                            </div>
                            <div className={s.tileText}>
                                <h3>{t.title}</h3>
                            </div>
                        </motion.article>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
