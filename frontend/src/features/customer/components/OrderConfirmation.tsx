"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, ChefHat, Clock, Plus, Receipt } from "lucide-react";
import { getTableBill, getTableOrder, type TableBill, type TableOrderView } from "@/features/customer/api";
import { useTableLink } from "@/features/customer/table-link";
import { apiErrorMessage } from "@/lib/api";
import { formatTime } from "@/lib/dates";
import { useMoney } from "@/components/money/MoneyProvider";
import { CUSTOMER_STATUS, isFinal } from "@/lib/order-status";
import { ThemeToggle } from "@/components/marketing/tour/ThemeToggle";

/** VM-07: shown right after ordering. The order as the server saved it, and the table's orders so far.
 *  VM-27: its status, checked every 10 seconds until it's served or cancelled. */
export default function OrderConfirmation({ pollMs = 10_000 }: { pollMs?: number } = {}) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const params = useParams<{ orderId: string }>();
    const link = useTableLink(); // SEC-04: the table's link token, or its name on the old pages
    const menuHref = link.base;

    const [order, setOrder] = useState<TableOrderView | null>(null);
    const [bill, setBill] = useState<TableBill | null>(null);
    const [error, setError] = useState<string | null>(null);

    const finished = order ? isFinal(order.status) : false;
    const load = useCallback(() => {
        getTableOrder(link, String(params.orderId))
            .then(setOrder)
            .catch((err) => setError(apiErrorMessage(err, "Couldn't load this order.")));
        getTableBill(link)
            .then(setBill)
            .catch(() => setBill(null)); // the list is a bonus; the order above is what matters
        // eslint-disable-next-line react-hooks/exhaustive-deps -- link is rebuilt each render; its parts are listed
    }, [link.slug, link.token, link.name, params.orderId]);
    const table = order?.table ?? bill?.table ?? link.name; // the server's name for the table

    // once when the page opens
    useEffect(load, [load]);

    // VM-27: then every pollMs, until the status can't change any more. Its own effect, so
    // reaching a final status only stops the timer and doesn't load once more.
    useEffect(() => {
        if (finished) return;
        const timer = setInterval(load, pollMs);
        return () => clearInterval(timer);
    }, [load, pollMs, finished]);

    return (
        <div className="min-h-screen bg-[var(--bg)] pb-28 text-[var(--ink)]">
            <header className="vm-band px-4 py-4">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ChefHat size={24} aria-hidden />
                        {table && (
                            <p className="rounded-[var(--r-chip)] border border-white/30 px-2.5 py-1 font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)]">
                                Table {table}
                            </p>
                        )}
                    </div>
                    <ThemeToggle className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-chip)] border border-white/30 text-white hover:bg-white/10" />
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
                {error && (
                    <div role="alert" className="rounded-[var(--r-card)] border border-[var(--bad)] bg-[var(--bad-soft)] p-5">
                        <p className="font-semibold">{error}</p>
                        <Link href={menuHref} className="mt-3 inline-block font-semibold text-[var(--accent-text)] underline">
                            Back to the menu
                        </Link>
                    </div>
                )}

                {!order && !error && (
                    <div role="status" className="h-48 rounded-[var(--r-card)] bg-[var(--card)]">
                        <span className="sr-only">Loading your order</span>
                    </div>
                )}

                {order && (
                    <section
                        aria-labelledby="this-order"
                        className="rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-5"
                    >
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={28} aria-hidden className="mt-0.5 shrink-0 text-[var(--ok)]" />
                            <div>
                                <h1 className="font-[family-name:var(--f-display)] text-xl font-semibold">
                                    Order #{order.number} sent to the kitchen
                                </h1>
                                <p className="mt-1 flex items-center gap-1.5 font-[family-name:var(--f-mono)] text-sm text-[var(--muted)]">
                                    <Clock size={14} aria-hidden /> Placed at {formatTime(order.placedAt)}
                                </p>
                            </div>
                        </div>

                        <div
                            role="status"
                            aria-label="Order status"
                            className={`mt-4 rounded-[var(--r-chip)] px-4 py-3 ${
                                order.status === "cancelled"
                                    ? "bg-[var(--bad-soft)]"
                                    : order.status === "ready"
                                      ? "bg-[var(--accent-soft)]"
                                      : "bg-[var(--ok-soft)]"
                            }`}
                        >
                            <p className="font-[family-name:var(--f-mono)] text-sm font-semibold uppercase tracking-[var(--label-track)]">
                                {CUSTOMER_STATUS[order.status].label}
                            </p>
                            <p className="text-sm text-[var(--body)]">
                                {order.status === "cancelled" && order.cancelReason
                                    ? `Reason: ${order.cancelReason}. It won't be on your bill.`
                                    : CUSTOMER_STATUS[order.status].note}
                            </p>
                        </div>

                        <h2 id="this-order" className="sr-only">
                            This order
                        </h2>
                        <ul className="mt-5 divide-y divide-[var(--line)]">
                            {order.lines.map((line, i) => (
                                <li key={i} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium">{line.name}</p>
                                        <p className="font-[family-name:var(--f-mono)] text-sm text-[var(--muted)]">
                                            {line.quantity} × {money(line.priceCents)}
                                        </p>
                                        {line.note && <p className="text-sm italic text-[var(--muted)]">“{line.note}”</p>}
                                    </div>
                                    <p className="font-[family-name:var(--f-mono)] font-semibold">{money(line.totalCents)}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-4">
                            <p className="font-semibold">Total</p>
                            <p className="font-[family-name:var(--f-mono)] text-2xl font-semibold">{money(order.totalCents)}</p>
                        </div>
                    </section>
                )}

                {bill && bill.orders.length > 0 && (
                    <section
                        aria-labelledby="table-orders"
                        className="rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-5"
                    >
                        <h2 id="table-orders" className="flex items-center gap-2 font-semibold">
                            <Receipt size={18} aria-hidden /> Your orders at this table
                        </h2>
                        <ul className="mt-3 divide-y divide-[var(--line)]">
                            {bill.orders.map((o) => (
                                <li key={o._id} className="flex items-center justify-between py-2.5 text-sm">
                                    <span>
                                        <span className="font-[family-name:var(--f-mono)] font-semibold">#{o.number}</span>
                                        <span className="text-[var(--muted)]"> · {formatTime(o.placedAt)}</span>
                                        {o._id === order?._id && (
                                            <span className="ml-2 rounded-[var(--r-chip)] bg-[var(--ok-soft)] px-2 py-0.5 text-xs text-[var(--ok)]">
                                                just now
                                            </span>
                                        )}
                                    </span>
                                    {o.status === "cancelled" ? (
                                        <span className="text-[var(--muted)]">
                                            <del>{money(o.totalCents)}</del> cancelled
                                        </span>
                                    ) : (
                                        <span className="font-[family-name:var(--f-mono)] font-semibold">{money(o.totalCents)}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-3">
                            <p className="text-sm font-semibold">Bill so far</p>
                            <p className="font-[family-name:var(--f-mono)] font-semibold">{money(bill.totalCents)}</p>
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted)]">Pay at the counter when you&apos;re done.</p>
                    </section>
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--line)] bg-[var(--bg)] p-4">
                <div className="mx-auto max-w-2xl">
                    <Link
                        href={menuHref}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--r-chip)] bg-[var(--btn-bg)] font-semibold text-[var(--btn-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                        <Plus size={18} aria-hidden /> Order more
                    </Link>
                </div>
            </div>
        </div>
    );
}
