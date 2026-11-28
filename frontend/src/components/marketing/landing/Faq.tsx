"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { FAQS } from "./faq-data";
import s from "./landing.module.css";
import { ease } from "./motion";
import { SectionHead } from "./Parts";

/** Common questions, opened one at a time. */
export function Faq() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section id="faq" className={s.section} aria-labelledby="faq-title">
            <div className={`${s.container} ${s.faq}`}>
                <SectionHead id="faq-title" title="Questions?" />
                <div>
                    {FAQS.map((item, i) => {
                        const isOpen = open === i;
                        return (
                            <div key={item.q} className={s.qa}>
                                <h3>
                                    <button
                                        type="button"
                                        className={s.qaBtn}
                                        aria-expanded={isOpen}
                                        aria-controls={isOpen ? `faq-${i}` : undefined}
                                        onClick={() => setOpen(isOpen ? null : i)}
                                    >
                                        {item.q}
                                        <motion.span
                                            className={s.qaIcon}
                                            animate={{ rotate: isOpen ? 45 : 0 }}
                                            transition={{ duration: 0.3, ease }}
                                        >
                                            <Plus size={16} aria-hidden="true" />
                                        </motion.span>
                                    </button>
                                </h3>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            id={`faq-${i}`}
                                            className={s.qaBody}
                                            initial={{ height: 0 }}
                                            animate={{ height: "auto" }}
                                            exit={{ height: 0 }}
                                            transition={{ duration: 0.35, ease }}
                                        >
                                            <p>{item.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
