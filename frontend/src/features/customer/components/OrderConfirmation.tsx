"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, ChefHat, Clock, Plus, Receipt } from "lucide-react";
import { getTableBill, getTableOrder, type TableBill, type TableOrderView } from "@/features/customer/api";
import { apiErrorMessage } from "@/lib/api";

const money = (n: number) => `$${n.toFixed(2)}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** VM-07: shown right after ordering. The order as the server saved it, and the table's orders so far. */
export default function OrderConfirmation() {
    const params = useParams<{ res: string; table: string; orderId: string }>();
    const slug = String(params.res);
    const table = decodeURIComponent(String(params.table));
    const menuHref = `/${slug}/customer/${encodeURIComponent(table)}`;

    const [order, setOrder] = useState<TableOrderView | null>(null);
    const [bill, setBill] = useState<TableBill | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getTableOrder(slug, table, String(params.orderId))
            .then(setOrder)
            .catch((err) => setError(apiErrorMessage(err, "Couldn't load this order.")));
        getTableBill(slug, table)
            .then(setBill)
            .catch(() => setBill(null)); // the list is a bonus; the order above is what matters
    }, [slug, table, params.orderId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-28">
            <header className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-4 py-6 text-white">
                <div className="mx-auto flex max-w-2xl items-center gap-3">
                    <ChefHat size={28} aria-hidden />
                    <p className="text-sm font-medium text-emerald-50">Table {table}</p>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
                {error && (
                    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
                        <p className="font-semibold">{error}</p>
                        <Link href={menuHref} className="mt-3 inline-block font-semibold text-emerald-700 underline">
                            Back to the menu
                        </Link>
                    </div>
                )}

                {!order && !error && (
                    <div role="status" className="h-48 animate-pulse rounded-2xl bg-slate-200/70">
                        <span className="sr-only">Loading your order</span>
                    </div>
                )}

                {order && (
                    <section aria-labelledby="this-order" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={28} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Order #{order.number} sent to the kitchen</h1>
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                    <Clock size={14} aria-hidden /> Placed at {time(order.placedAt)}
                                </p>
                            </div>
                        </div>

                        <h2 id="this-order" className="sr-only">
                            This order
                        </h2>
                        <ul className="mt-5 divide-y divide-slate-100">
                            {order.lines.map((line, i) => (
                                <li key={i} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{line.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {line.quantity} × {money(line.price)}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-slate-900">{money(line.total)}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4">
                            <p className="font-semibold text-slate-700">Total</p>
                            <p className="text-2xl font-bold text-emerald-700">{money(order.total)}</p>
                        </div>
                    </section>
                )}

                {bill && bill.orders.length > 0 && (
                    <section aria-labelledby="table-orders" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 id="table-orders" className="flex items-center gap-2 font-bold text-slate-900">
                            <Receipt size={18} aria-hidden /> Your orders at this table
                        </h2>
                        <ul className="mt-3 divide-y divide-slate-100">
                            {bill.orders.map((o) => (
                                <li key={o._id} className="flex items-center justify-between py-2.5 text-sm">
                                    <span className="text-slate-700">
                                        <span className="font-mono font-semibold">#{o.number}</span>
                                        <span className="text-slate-400"> · {time(o.placedAt)}</span>
                                        {o._id === order?._id && (
                                            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                                just now
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-semibold text-slate-900">{money(o.total)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
                            <p className="text-sm font-semibold text-slate-700">Bill so far</p>
                            <p className="font-bold text-slate-900">{money(bill.total)}</p>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Pay at the counter when you're done.</p>
                    </section>
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 p-4 backdrop-blur">
                <div className="mx-auto max-w-2xl">
                    <Link
                        href={menuHref}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 font-semibold text-white shadow-lg"
                    >
                        <Plus size={18} aria-hidden /> Order more
                    </Link>
                </div>
            </div>
        </div>
    );
}
