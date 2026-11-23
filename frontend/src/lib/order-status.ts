import type { ChipTone } from "@/components/ui/Chip";
import type { OrderStatus } from "@vmenu/contracts";

// VM-27: how an order's status reads, for staff and for the customer.

/** On the staff screens (kitchen columns, the cashier's bill). */
export const STATUS_LABEL: Record<OrderStatus, string> = {
    pending: "New",
    preparing: "Preparing",
    ready: "Ready",
    served: "Served",
    cancelled: "Cancelled",
};

/** On the cashier's bill: "New" there would read like the bill's own NEW badge (VM-11). */
export const BILL_STATUS_LABEL: Record<OrderStatus, string> = { ...STATUS_LABEL, pending: "Ordered" };

export const STATUS_TONE: Record<OrderStatus, ChipTone> = {
    pending: "accent",
    preparing: "accent",
    ready: "ok",
    served: "neutral",
    cancelled: "bad",
};

/** The one step the kitchen may take from each status. The same as NEXT_STATUS in @vmenu/contracts
 *  (test/contracts.test.ts checks); copied because the browser imports types only from there (CL-05). */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = { pending: "preparing", preparing: "ready", ready: "served" };

/** The kitchen's one big button: what it does from each status. */
export const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
    pending: "Start preparing",
    preparing: "Mark ready",
    ready: "Mark served",
};

/** On the customer's confirmation page. */
export const CUSTOMER_STATUS: Record<OrderStatus, { label: string; note: string }> = {
    pending: { label: "Waiting for the kitchen", note: "The kitchen has your order and will start on it soon." },
    preparing: { label: "Being prepared", note: "The kitchen is cooking your order." },
    ready: { label: "Ready", note: "Your order is ready and on its way to your table." },
    served: { label: "Served", note: "Enjoy your meal!" },
    cancelled: { label: "Cancelled", note: "This order was cancelled and won't be on your bill." },
};

/** Statuses that won't change again, so there's nothing to keep checking. */
export const isFinal = (status: OrderStatus) => status === "served" || status === "cancelled";
