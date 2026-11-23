"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, X } from "lucide-react";

/** The owner's navigation on small screens: slides in from the right (CL-09, from the old Header). */
export default function MobileSidebar({ open, onClose, user, children }: { open: boolean; onClose: () => void; user: { name: string; role: string }; children: ReactNode }) {
    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-40 flex lg:hidden">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/50" onClick={onClose} />
                    <motion.nav
                        aria-label="Owner menu"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="relative z-50 ml-auto min-h-screen w-72 max-w-xs overflow-y-auto border-l border-[var(--line)] bg-[var(--bg)] py-4 text-[var(--ink)]"
                    >
                        <div className="flex justify-end px-6">
                            <button type="button" aria-label="Close the menu" onClick={onClose} className="rounded-[var(--r-chip)] p-1 hover:bg-[var(--card)]">
                                <X size={22} aria-hidden />
                            </button>
                        </div>
                        <div className="border-b border-[var(--line)] px-6 py-4">
                            <div className="flex items-center gap-3 rounded-[var(--r-chip)] bg-[var(--card)] p-3">
                                <User size={20} aria-hidden />
                                <div>
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-[var(--muted)]">{user.role}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6 px-6 py-4">{children}</div>
                    </motion.nav>
                </div>
            )}
        </AnimatePresence>
    );
}
