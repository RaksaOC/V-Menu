"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { DISHES, RESTAURANT, money } from "./mock-data";
import s from "./mocks.module.css";
import { useTicker } from "./use-ticker";

const CATEGORIES = ["All", "Mains", "Noodles", "Drinks"];

/** A guest's phone on the table menu: a dish gets added every couple of seconds. */
export function PhoneMenu({ table = "Table 4" }: { table?: string }) {
    const tick = useTicker(1700);
    const added = tick % DISHES.length;
    const items = 1 + (tick % 4);
    const total = DISHES.slice(0, items).reduce((sum, d) => sum + d.price, 0);

    return (
        <div className={s.phone}>
            <div className={s.screen}>
                <div className={s.band}>
                    <strong>{RESTAURANT}</strong>
                    <span>{table} · Order from your table</span>
                </div>
                <div className={s.cats}>
                    {CATEGORIES.map((c, i) => (
                        <span key={c} className={`${s.cat} ${i === 0 ? s.catOn : ""}`}>
                            {c}
                        </span>
                    ))}
                </div>
                <div className={s.dishes}>
                    {DISHES.map((d, i) => (
                        <div key={d.name} className={s.dish}>
                            <Image src={d.img} alt="" width={160} height={125} className={s.dishImg} />
                            {d.tag && <span className={s.dishTag}>{d.tag}</span>}
                            <div className={s.dishBody}>
                                <span className={s.dishName}>{d.name}</span>
                                <span className={s.dishPrice}>{money(d.price)}</span>
                            </div>
                            <motion.span
                                className={`${s.add} ${i === added ? s.addOn : ""}`}
                                animate={i === added ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                                transition={{ duration: 0.45 }}
                            >
                                {i === added ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                            </motion.span>
                        </div>
                    ))}
                </div>
                <div className={s.cartBar}>
                    <span>
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                                key={items}
                                className={s.cartCount}
                                initial={{ y: -10, scale: 0 }}
                                animate={{ y: 0, scale: 1 }}
                                exit={{ y: 10, scale: 0 }}
                            >
                                {items}
                            </motion.span>
                        </AnimatePresence>
                        View order
                    </span>
                    <span>
                        <ShoppingBag size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} aria-hidden="true" />
                        {money(total)}
                    </span>
                </div>
            </div>
        </div>
    );
}
