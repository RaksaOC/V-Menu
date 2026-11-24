import { BellRing, Receipt, X } from "lucide-react";
import type { Bill, TableRequestKind } from "@vmenu/contracts";

/** VM-30: how long the customer has been waiting: "just now", "3 min". */
const waited = (at: string) => {
    const minutes = Math.floor((Date.now() - new Date(at).getTime()) / 60_000);
    return minutes < 1 ? "just now" : `${minutes} min`;
};
const REQUEST_BADGES = [
    { kind: "bill", field: "billRequestedAt", label: "BILL REQUESTED", name: "bill request", Icon: Receipt },
    { kind: "staff", field: "staffCalledAt", label: "STAFF CALLED", name: "staff call", Icon: BellRing },
] as const;

/** VM-30: the customer asked for the bill, or for a staff member. */
export default function RequestBadges({
    order,
    onDismissRequest,
}: {
    order: Bill;
    onDismissRequest?: (billId: string, kind: TableRequestKind) => void;
}) {
    if (!REQUEST_BADGES.some(({ field }) => order[field])) return null;
    return (
        <div className="mb-3 flex flex-wrap gap-2">
            {REQUEST_BADGES.map(({ kind, field, label, name, Icon }) => {
                const at = order[field];
                if (!at) return null;
                return (
                    <span
                        key={kind}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-sm font-bold tracking-wide text-[var(--accent-text)]"
                    >
                        <Icon size={14} aria-hidden />
                        {label} · {waited(at)}
                        {!order.isPaid && onDismissRequest && (
                            <button
                                type="button"
                                aria-label={`Dismiss ${name}`}
                                onClick={() => onDismissRequest(order._id, kind)}
                                className="-mr-1 rounded-full p-0.5 hover:bg-[var(--accent-soft)]"
                            >
                                <X size={14} aria-hidden />
                            </button>
                        )}
                    </span>
                );
            })}
        </div>
    );
}
