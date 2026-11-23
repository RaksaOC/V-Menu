"use client";
import { useEffect, useState } from "react";
import Invoice from "./Invoice";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { useParams } from "next/navigation";
import { DollarSign, Eye, EyeOff, XCircle } from "lucide-react";
import { Button, Chip, Input } from "@/components/ui";
import { BILL_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import type { Bill, Order } from "@vmenu/contracts";

interface Props {
    order: Bill;
    onMarkPaid: (id: string) => void;
    /** VM-11: a new bill, or one that got another order since the cashier last looked */
    isNew?: boolean;
    /** called when the cashier opens the invoice, which clears NEW */
    onSeen?: (id: string) => void;
    /** VM-27: cancel one order on this (open) bill, with a reason */
    onCancelOrder?: (billId: string, orderId: string, reason: string) => void;
}

const orderNumber = (id: string) => id.slice(-6).toUpperCase();

function OrderCard({ order, onMarkPaid, isNew = false, onSeen, onCancelOrder }: Props) {
    const [showInvoice, setShowInvoice] = useState(false);
    const [cancelling, setCancelling] = useState<{ id: string; reason: string; error: string } | null>(null);
    const params = useParams();
    // Access nested structure: order.orders = array of sub-orders, each with its own items
    const subOrders = order.orders;

    // useEffect(() => {
    //     const getResDetails = async () => {
    //         const res = await getResFromSlug(params.slug as string);
    //         setRes(res);
    //     }
    //     getResDetails();
    // }, [])

    return (
        <article className="rounded-2xl overflow-hidden bg-none w-full p-4  ">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2.5">Table {order.table}</h3>
                {isNew && (
                    <Chip tone="accent" className="font-bold tracking-wide">
                        NEW
                    </Chip>
                )}
                {/*<span className="text-sm text-zinc-500 dark:text-zinc-400">Order ID: {order._id}</span>*/}
            </div>

            <div className="bg-none  rounded-xl p-3 mb-4 border border-slate-500">
                {subOrders.length > 0 ? (
                    subOrders.map((subOrder, index) => {
                        const cancelled = subOrder.status === "cancelled";
                        const lines = subOrder.orderedItems.map((item) => (
                            <div
                                key={item.item._id}
                                className="flex items-center justify-between gap-2 border-b last:border-none border-zinc-200 dark:border-zinc-600 py-2"
                            >
                                <div className="flex items-center gap-3">
                                    <img src={item.item.image} alt={item.item.name} className="w-10 h-10 object-cover rounded" />
                                    <div>
                                        <p className="text-zinc-800 dark:text-white font-semibold">{item.item.name}</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {formatMoney(item.item.priceCents)} × {item.quantity}
                                        </p>
                                    </div>
                                </div>
                                <p className="font-bold text-zinc-700 dark:text-white">
                                    {formatMoney(item.item.priceCents * item.quantity)}
                                </p>
                            </div>
                        ));
                        return (
                            <div key={subOrder._id ?? index} className="m-4 border-b border-zinc-300 dark:border-zinc-600 last:border-b-0">
                                <div className={"flex flex-wrap justify-between gap-2 w-full items-center"}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Order {index + 1}</p>
                                        {subOrder.status && (
                                            <Chip tone={STATUS_TONE[subOrder.status]}>{BILL_STATUS_LABEL[subOrder.status]}</Chip>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className={"text-gray-400"}>{formatDateTime(subOrder.createdAt)}</p>
                                        {!order.isPaid && !cancelled && onCancelOrder && cancelling?.id !== subOrder._id && (
                                            <button
                                                type="button"
                                                aria-label={`Cancel order #${orderNumber(subOrder._id)}`}
                                                onClick={() => setCancelling({ id: subOrder._id, reason: "", error: "" })}
                                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                            >
                                                <XCircle size={14} aria-hidden /> Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {cancelling?.id === subOrder._id && (
                                    <form
                                        className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-red-50 p-3 text-left dark:bg-red-950/40"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!cancelling.reason.trim()) return setCancelling({ ...cancelling, error: "Give a reason" });
                                            onCancelOrder?.(order._id, subOrder._id, cancelling.reason.trim());
                                            setCancelling(null);
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <Input
                                                label="Why is it cancelled?"
                                                value={cancelling.reason}
                                                maxLength={200}
                                                autoFocus
                                                placeholder="e.g. Wrong dish, guest left"
                                                error={cancelling.error || undefined}
                                                onChange={(e) => setCancelling({ ...cancelling, reason: e.target.value, error: "" })}
                                            />
                                        </div>
                                        <Button type="submit" variant="danger" size="sm">
                                            Confirm cancel
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setCancelling(null)}>
                                            Keep order
                                        </Button>
                                    </form>
                                )}

                                {cancelled ? (
                                    <>
                                        <del className="block opacity-60">{lines}</del>
                                        <p className="pb-2 text-left text-sm text-red-600 dark:text-red-400">
                                            Cancelled{subOrder.cancelReason ? `: ${subOrder.cancelReason}` : ""} (not charged)
                                        </p>
                                    </>
                                ) : (
                                    lines
                                )}
                            </div>
                        );
                    })
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
                        <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatMoney(order.totalCents)}</span>
                    </div>
                )}
            </div>

            {showInvoice && (
                <Invoice
                    businessName={params.res as string}
                    address={"Address will be supported soon"}
                    phone={"(123) 456-7890"}
                    invoiceId={`${order._id}`}
                    date={formatDateTime(new Date())}
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
