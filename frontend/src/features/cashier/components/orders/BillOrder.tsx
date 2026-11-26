import { XCircle } from "lucide-react";
import type { Bill } from "@vmenu/contracts";
import { useMoney } from "@/components/money/MoneyProvider";
import { Button, Chip, Input } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { BILL_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { orderNumber } from "./order-number";

export type Cancelling = { id: string; reason: string; error: string };

/** One order on a bill: its dishes, its status, and Cancel with a reason (VM-27). */
export default function BillOrder({
    order,
    subOrder,
    index,
    onCancelOrder,
    cancelling,
    setCancelling,
}: {
    order: Bill;
    subOrder: Bill["orders"][number];
    index: number;
    onCancelOrder?: (billId: string, orderId: string, reason: string) => void;
    /** The card's one open cancel form, if any (kept by the card so only one is open at a time). */
    cancelling: Cancelling | null;
    setCancelling: (c: Cancelling | null) => void;
}) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const cancelled = subOrder.status === "cancelled";
    const lines = subOrder.orderedItems.map((item, line) => (
        <div
            key={line} // VM-28: the same dish can be on two lines, with different notes
            className="flex items-center justify-between gap-2 border-b last:border-none border-[var(--line)] py-2"
        >
            <div className="flex items-center gap-3">
                <img src={item.item.image} alt={item.item.name} className="w-10 h-10 object-cover rounded" />
                <div>
                    <p className="text-[var(--ink)] font-semibold">{item.item.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                        {money(item.item.priceCents)} × {item.quantity}
                    </p>
                    {item.note && <p className="text-sm italic text-[var(--body)]">“{item.note}”</p>}
                </div>
            </div>
            <p className="font-bold text-[var(--body)]">{money(item.item.priceCents * item.quantity)}</p>
        </div>
    ));
    return (
        <div className="m-4 border-b border-[var(--line)] last:border-b-0">
            <div className={"flex flex-wrap justify-between gap-2 w-full items-center"}>
                <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-[var(--body)]">Order {index + 1}</p>
                    {subOrder.status && <Chip tone={STATUS_TONE[subOrder.status]}>{BILL_STATUS_LABEL[subOrder.status]}</Chip>}
                </div>
                <div className="flex items-center gap-3">
                    <p className={"text-[var(--muted)]"}>{formatDateTime(subOrder.createdAt)}</p>
                    {!order.isPaid && !cancelled && onCancelOrder && cancelling?.id !== subOrder._id && (
                        <button
                            type="button"
                            aria-label={`Cancel order #${orderNumber(subOrder._id)}`}
                            onClick={() => setCancelling({ id: subOrder._id, reason: "", error: "" })}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-[var(--bad)] hover:bg-[var(--bad-soft)]"
                        >
                            <XCircle size={14} aria-hidden /> Cancel
                        </button>
                    )}
                </div>
            </div>

            {cancelling?.id === subOrder._id && (
                <form
                    className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-[var(--bad-soft)] p-3 text-left"
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
                    <del className="block">{lines}</del>
                    <p className="pb-2 text-left text-sm text-[var(--bad)]">
                        Cancelled{subOrder.cancelReason ? `: ${subOrder.cancelReason}` : ""} (not charged)
                    </p>
                </>
            ) : (
                lines
            )}
        </div>
    );
}
