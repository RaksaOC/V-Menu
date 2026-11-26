"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import type { Order } from "@vmenu/contracts";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui";
import type { ChipTone } from "@/components/ui/Chip";
import { NEXT_ACTION, STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { AGE_CHIP_CLASS, ageLabel, ageTone } from "@/features/kitchen/kitchen-screen";

interface CardProps {
    order: Order;
    /** VM-27: the one big button that moves the order a step on; without it (history) there's no button */
    onAdvance?: (order: Order) => Promise<void> | void;
    /** VM-29: just arrived: the border flashes once */
    isNew?: boolean;
    /** VM-29: kiosk mode: large type, no photos */
    kiosk?: boolean;
    /** the time the age chip counts from; the board updates it */
    now?: number;
}

const mono = "font-[family-name:var(--f-mono)]";
// the history's status label: the tone's soft colour behind ink text, readable in light and dark
const STATUS_BG: Record<ChipTone, string> = {
    ok: "bg-[var(--ok-soft)]",
    bad: "bg-[var(--bad-soft)]",
    accent: "bg-[var(--accent-soft)]",
    neutral: "bg-[var(--surface-2)]",
};

/** One order on the kitchen screen (VM-34): a --card panel with the table in large mono, the dishes
 *  in large type with their quantities in bold mono, notes in coral, and one full-width button. */
const Card = ({ order, onAdvance, isNew = false, kiosk = false, now }: CardProps) => {
    const { _id: orderId, table, orderedItems, createdAt: orderedAt, status } = order;
    const action = onAdvance && NEXT_ACTION[status];
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            await onAdvance?.(order);
        } finally {
            setIsCompleting(false);
        }
    };

    const totalItems = orderedItems.reduce((sum, item) => sum + item.quantity, 0);
    // VM-29: a fixed age chip: green under 5 minutes, accent 5 to 15, red over 15
    const age = (now ?? Date.now()) - new Date(orderedAt).getTime();
    const tone = ageTone(age);

    return (
        <article
            data-new={isNew ? "true" : undefined}
            className={`flex w-full flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] ${isNew ? "vm-flash" : ""}`}
        >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
                <div className="min-w-0">
                    {/* kiosk mode: the table number gets the room */}
                    <h3 className={`${mono} font-bold leading-none ${kiosk ? "whitespace-nowrap text-5xl" : "break-words text-3xl"}`}>
                        <span className="sr-only">Table</span> {table}
                    </h3>
                    <p className={`${mono} mt-2 text-xs text-[var(--muted)]`}>
                        <span className="text-[var(--muted)]">Order #{orderId.slice(-6).toUpperCase()}</span>
                        <span className={kiosk ? "hidden" : ""}> · {formatDateTime(orderedAt)}</span>
                        <span>
                            {" "}
                            · {totalItems} item{totalItems !== 1 ? "s" : ""}
                        </span>
                    </p>
                    {!onAdvance && (
                        <span
                            data-tone={STATUS_TONE[status]}
                            className={`${mono} mt-2 inline-block rounded-[var(--r-chip)] px-2 py-0.5 text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--ink)] ${STATUS_BG[STATUS_TONE[status]]}`}
                        >
                            {STATUS_LABEL[status]}
                        </span>
                    )}
                </div>
                {status !== "served" &&
                    status !== "cancelled" && ( // still the kitchen's to do
                        <span
                            data-testid="age-chip"
                            data-tone={tone}
                            className={`${mono} inline-flex shrink-0 items-center rounded-[var(--r-chip)] font-bold ${kiosk ? "px-4 py-1.5 text-xl" : "px-2.5 py-1 text-sm"} ${AGE_CHIP_CLASS[tone]}`}
                        >
                            {/* not by colour alone: a late order has a warning sign, a waiting one a clock */}
                            {tone === "late" && <AlertTriangle size={kiosk ? 20 : 14} aria-hidden className="mr-1" />}
                            {tone === "waiting" && <Clock size={kiosk ? 20 : 14} aria-hidden className="mr-1" />}
                            {ageLabel(age)}
                            <span className="sr-only">{tone === "late" ? ", waiting long" : tone === "waiting" ? ", waiting" : ""}</span>
                        </span>
                    )}
            </div>

            {/* VM-28: the customer's note for the whole order */}
            {order.note && (
                <div data-note className="mx-4 mt-4 rounded-[var(--r-chip)] border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] p-3">
                    <p className={`${mono} text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--accent-text)]`}>
                        Note
                    </p>
                    <p className="text-lg font-semibold text-[var(--accent-text)]">{order.note}</p>
                </div>
            )}

            <ul className="divide-y divide-[var(--line)] px-4">
                {orderedItems.map((orderedItem, index) => (
                    <li key={index} className="flex items-start gap-3 py-3">
                        <span className={`${mono} min-w-[2.5rem] font-bold ${kiosk ? "text-3xl" : "text-xl"}`}>
                            {orderedItem.quantity}×
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className={`break-words font-semibold leading-snug ${kiosk ? "text-3xl" : "text-xl"}`}>
                                {orderedItem.item.name}
                            </p>
                            {/* VM-28: "no chilli", under the dish, in coral */}
                            {orderedItem.note && (
                                <p className="mt-1 break-words border-l-4 border-[var(--accent)] pl-2 font-semibold text-[var(--accent-text)]">
                                    {orderedItem.note}
                                </p>
                            )}
                        </div>
                        <img
                            src={orderedItem.item.image}
                            alt={orderedItem.item.name}
                            loading="lazy"
                            className={`h-12 w-12 shrink-0 rounded-[var(--r-chip)] object-cover ${kiosk ? "hidden" : ""}`}
                        />
                    </li>
                ))}
            </ul>

            {/* VM-27: one big button, to the next step; coral for Mark ready */}
            {action && (
                <div className="mt-auto p-4">
                    <Button
                        variant={status === "preparing" ? "primary" : "solid"}
                        block
                        loading={isCompleting}
                        onClick={handleComplete}
                        className="min-h-14 text-lg"
                    >
                        {action}
                        {!isCompleting && <ArrowRight size={22} aria-hidden />}
                    </Button>
                </div>
            )}
        </article>
    );
};

export default Card;
