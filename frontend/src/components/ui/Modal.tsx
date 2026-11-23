"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const WIDTHS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

interface ModalProps {
    title: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: keyof typeof WIDTHS;
    /** For a title that isn't plain text, e.g. a table name with a hidden prefix. */
    description?: ReactNode;
}

/**
 * The one dialog (CL-09, VM-36): labelled by its title, closes with Escape, the close button or a
 * click on the backdrop, keeps Tab inside, and gives focus back to whatever opened it.
 */
export default function Modal({ title, onClose, children, footer, size = "md", description }: ModalProps) {
    const panel = useRef<HTMLDivElement>(null);
    const close = useRef(onClose);
    close.current = onClose;
    const titleId = useId();

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        (focusables()[0] ?? panel.current)?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                close.current();
            } else if (e.key === "Tab") {
                const items = focusables();
                if (items.length === 0) return e.preventDefault();
                const first = items[0];
                const last = items[items.length - 1];
                const inside = panel.current?.contains(document.activeElement);
                if (e.shiftKey && (document.activeElement === first || !inside)) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            opener?.focus?.();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div data-testid="modal-backdrop" aria-hidden className="absolute inset-0 bg-black/50" onClick={() => close.current()} />
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`relative max-h-[90vh] w-full overflow-y-auto rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] shadow-[var(--pop)] ${WIDTHS[size]}`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
                    <div>
                        <h2 id={titleId} className="text-lg font-semibold">
                            {title}
                        </h2>
                        {description && <div className="mt-1 text-sm text-[var(--muted)]">{description}</div>}
                    </div>
                    <button
                        type="button"
                        onClick={() => close.current()}
                        aria-label="Close"
                        className="-mr-2 -mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-chip)] text-[var(--muted)] hover:bg-[var(--card)]"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] px-6 py-4">{footer}</div>}
            </div>
        </div>
    );
}
