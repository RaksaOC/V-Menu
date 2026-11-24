"use client";

import React, { useState } from "react";
import { Clock, ArrowRight, Users, Hash } from "lucide-react";
import type { Order } from "@vmenu/contracts";
import { formatDateTime } from "@/lib/dates";
import { useMoney } from "@/components/money/MoneyProvider";
import { Chip } from "@/components/ui";
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

const Card = ({ order, onAdvance, isNew = false, kiosk = false, now }: CardProps) => {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
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
            className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group w-full ${isNew ? "vm-flash" : ""}`}
        >
            {/* Order Header */}
            <div className="bg-gradient-to-r from-slate-600 to-gray-600 text-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex min-w-0 items-center gap-3">
                        {/* kiosk mode: the table number gets the room */}
                        <div className={`p-2 bg-white/20 rounded-full backdrop-blur-sm ${kiosk ? "hidden" : ""}`}>
                            <Users size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className={`font-bold ${kiosk ? "text-5xl leading-tight whitespace-nowrap" : "text-2xl"}`}>
                                Table {table}
                            </h3>
                            <p className="text-slate-200 text-sm">Order #{orderId.slice(-6).toUpperCase()}</p>
                            {!onAdvance && (
                                <Chip tone={STATUS_TONE[status]} className="mt-1">
                                    {STATUS_LABEL[status]}
                                </Chip>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className={`flex items-center gap-2 mb-1 ${kiosk ? "hidden" : ""}`}>
                            <Clock size={16} className="text-slate-300" />
                            <span className="text-sm text-slate-200">{formatDateTime(orderedAt)}</span>
                        </div>
                        {status !== "served" &&
                            status !== "cancelled" && ( // still the kitchen's to do
                                <span
                                    data-testid="age-chip"
                                    data-tone={tone}
                                    className={`inline-flex items-center rounded-full font-bold ${kiosk ? "px-4 py-1.5 text-xl" : "px-3 py-1 text-sm"} ${AGE_CHIP_CLASS[tone]}`}
                                >
                                    {ageLabel(age)}
                                    <span className="sr-only">
                                        {tone === "late" ? ", waiting long" : tone === "waiting" ? ", waiting" : ""}
                                    </span>
                                </span>
                            )}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-slate-200">
                    <div className="flex items-center gap-2">
                        <Hash size={16} />
                        <span className="text-sm font-medium">
                            {totalItems} item{totalItems !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* Order Items */}
            <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-gray-500 rounded-full"></div>
                    Order Details
                </h4>

                {/* VM-28: the customer's note for the whole order */}
                {order.note && (
                    <div data-note className="mb-4 rounded-2xl border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-text)]">Note</p>
                        <p className="text-lg font-semibold text-gray-900">{order.note}</p>
                    </div>
                )}

                <div className="space-y-3">
                    {orderedItems.map((orderedItem, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors duration-200 border border-gray-100"
                        >
                            <div className={`flex-shrink-0 ${kiosk ? "hidden" : ""}`}>
                                <img
                                    src={orderedItem.item.image}
                                    alt={orderedItem.item.name}
                                    className="w-16 h-16 object-cover rounded-xl shadow-sm"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h5 className={`font-semibold text-gray-800 mb-1 ${kiosk ? "text-2xl" : "truncate"}`}>
                                    {orderedItem.item.name}
                                </h5>
                                <p className="text-sm text-gray-500">{money(orderedItem.item.priceCents)} each</p>
                                {/* VM-28: "no chilli", under the dish, in the accent colour */}
                                {orderedItem.note && (
                                    <p className="mt-2 inline-block rounded-lg border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 font-semibold text-[var(--accent-text)] break-words">
                                        {orderedItem.note}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <div
                                    className={`bg-slate-600 text-white rounded-full font-bold min-w-[3rem] text-center ${kiosk ? "px-4 py-2 text-2xl" : "px-3 py-1.5 text-sm"}`}
                                >
                                    ×{orderedItem.quantity}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* VM-27: one big button, to the next step */}
            {action && (
                <div className="p-6 pt-0">
                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                    >
                        {isCompleting ? (
                            <>
                                <div
                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                                    aria-hidden
                                ></div>
                                {action}
                            </>
                        ) : (
                            <>
                                {action}
                                <ArrowRight size={22} aria-hidden />
                            </>
                        )}
                    </button>
                </div>
            )}
        </article>
    );
};

export default Card;
