"use client";

import { useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, X } from "lucide-react";
import { useDialog } from "@/components/ui/use-dialog";

/** The owner's navigation on small screens: slides in from the right (CL-09, from the old Header). */
export default function MobileSidebar(props: Props) {
    return <AnimatePresence>{props.open && <Panel {...props} />}</AnimatePresence>;
}

type Props = {
    open: boolean;
    onClose: () => void;
    user: { name: string; role: string };
    children: ReactNode;
};

/** VM-36: a modal dialog labelled by its heading; Escape closes it and Tab stays inside. */
function Panel({ onClose, user, children }: Props) {
    const panel = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useDialog(panel, onClose);
    return (
        <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden
                className="fixed inset-0 bg-black/50"
                onClick={onClose}
            />
            <motion.div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="relative z-50 ml-auto min-h-screen w-72 max-w-xs overflow-y-auto border-l border-[var(--line)] bg-[var(--bg)] py-4 text-[var(--ink)]"
            >
                <div className="flex items-center justify-between px-6">
                    <h2 id={titleId} className="text-lg font-semibold">
                        Menu
                    </h2>
                    <button
                        type="button"
                        aria-label="Close the menu"
                        onClick={onClose}
                        className="rounded-[var(--r-chip)] p-1 hover:bg-[var(--card)]"
                    >
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
                <nav aria-label="Owner menu" className="space-y-6 px-6 py-4">
                    {children}
                </nav>
            </motion.div>
        </div>
    );
}
