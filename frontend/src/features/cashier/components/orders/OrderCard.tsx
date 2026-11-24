"use client";
import { useState } from "react";
import Invoice from "./Invoice";
import { formatDateTime } from "@/lib/dates";
import { useMoney } from "@/components/money/MoneyProvider";
import { useParams } from "next/navigation";
import { DollarSign, Eye, EyeOff } from "lucide-react";
import { Chip } from "@/components/ui";
import type { Bill, TableRequestKind } from "@vmenu/contracts";
import BillOrder, { type Cancelling } from "./BillOrder";
import { orderNumber } from "./order-number";
import RequestBadges from "./RequestBadges";

interface Props {
    order: Bill;
    onMarkPaid: (id: string) => void;
    /** VM-11: a new bill, or one that got another order since the cashier last looked */
    isNew?: boolean;
    /** called when the cashier opens the invoice, which clears NEW */
    onSeen?: (id: string) => void;
    /** VM-27: cancel one order on this (open) bill, with a reason */
    onCancelOrder?: (billId: string, orderId: string, reason: string) => void;
    /** VM-30: dismiss a "bill requested" or "staff called" badge */
    onDismissRequest?: (billId: string, kind: TableRequestKind) => void;
}

function OrderCard({ order, onMarkPaid, isNew = false, onSeen, onCancelOrder, onDismissRequest }: Props) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const [showInvoice, setShowInvoice] = useState(false);
    const [cancelling, setCancelling] = useState<Cancelling | null>(null);
    const params = useParams();
    // Access nested structure: order.orders = array of sub-orders, each with its own items
    const subOrders = order.orders;

    return (
        <article className="rounded-2xl overflow-hidden bg-none w-full p-4  ">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2.5">Table {order.table}</h3>
                {isNew && (
                    <Chip tone="accent" className="font-bold tracking-wide">
                        NEW
                    </Chip>
                )}
            </div>

            {/* VM-30: the customer asked for the bill, or for a staff member */}
            <RequestBadges order={order} onDismissRequest={onDismissRequest} />

            <div className="bg-none  rounded-xl p-3 mb-4 border border-slate-500">
                {subOrders.length > 0 ? (
                    subOrders.map((subOrder, index) => (
                        <BillOrder
                            key={subOrder._id ?? index}
                            order={order}
                            subOrder={subOrder}
                            index={index}
                            onCancelOrder={onCancelOrder}
                            cancelling={cancelling}
                            setCancelling={setCancelling}
                        />
                    ))
                ) : (
                    <p className="text-zinc-500 dark:text-zinc-400">No orders found.</p>
                )}
                {subOrders.length > 0 && (
                    <div
                        role="group"
                        aria-label="Bill total"
                        className="mx-4 mt-2 flex items-center justify-between border-t border-zinc-300 pt-3 dark:border-zinc-600"
                    >
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">Bill total</span>
                        <span className="text-lg font-bold text-zinc-900 dark:text-white">{money(order.totalCents)}</span>
                    </div>
                )}
            </div>

            {showInvoice && (
                <Invoice
                    slug={params.res as string}
                    table={order.table}
                    billNumber={orderNumber(order._id)}
                    date={formatDateTime(order.isPaid && order.updatedAt ? order.updatedAt : new Date())} // paid: when it was paid
                    lines={order.lines}
                    subtotalCents={order.subtotalCents}
                    totalCents={order.totalCents}
                    onClose={() => setShowInvoice(false)}
                />
            )}

            <div className="flex gap-3 mt-6">
                <button
                    onClick={() => {
                        setShowInvoice((prev) => !prev);
                        onSeen?.(order._id);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-3 px-4 rounded-xl transition-all duration-200"
                >
                    {showInvoice ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{showInvoice ? "Hide Invoice" : "View Invoice"}</span>
                </button>

                {!order.isPaid && (
                    <button
                        onClick={() => onMarkPaid(order._id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25"
                    >
                        <DollarSign size={16} />
                        <span>Mark as Paid</span>
                    </button>
                )}
            </div>
        </article>
    );
}

export default OrderCard;
