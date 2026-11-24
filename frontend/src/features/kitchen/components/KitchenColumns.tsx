import type { Order, OrderStatus } from "@vmenu/contracts";
import { STATUS_LABEL } from "@/lib/order-status";
import Card from "./OrderCard";

// VM-27: the board's columns
const COLUMNS: OrderStatus[] = ["pending", "preparing", "ready"];
const byAge = (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
const mono = "font-[family-name:var(--f-mono)]";

/** The orders in NEW / PREPARING / READY columns, oldest first (VM-34: each with a mono label and a count). */
export default function KitchenColumns({
    orders,
    fresh,
    kiosk,
    now,
    onAdvance,
}: {
    orders: Order[];
    fresh: string[];
    kiosk: boolean;
    now: number;
    onAdvance: (order: Order) => void;
}) {
    const sorted = [...orders].sort(byAge); // VM-29: oldest first
    return (
        <main className={kiosk ? "px-4 py-4" : "px-4 py-6 sm:px-6"}>
            <div className={kiosk ? "w-full" : "mx-auto max-w-7xl"}>
                {orders.length === 0 && (
                    <p role="status" className={`${mono} mb-4 text-sm uppercase tracking-[var(--label-track)] text-[var(--muted)]`}>
                        All caught up · waiting for new orders
                    </p>
                )}
                <div className="grid gap-6 lg:grid-cols-3">
                    {COLUMNS.map((status) => {
                        const inColumn = sorted.filter((o) => o.status === status);
                        return (
                            <section key={status} aria-label={STATUS_LABEL[status]} className="min-w-0 space-y-4">
                                <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-2">
                                    <h2
                                        className={`${mono} font-semibold uppercase tracking-[var(--label-track)] ${kiosk ? "text-2xl" : "text-base"}`}
                                    >
                                        {STATUS_LABEL[status]}
                                    </h2>
                                    <span className={`${mono} text-lg font-bold`}>{inColumn.length}</span>
                                </div>
                                {inColumn.length === 0 && (
                                    <p className="rounded-[var(--r-card)] border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
                                        No orders
                                    </p>
                                )}
                                {inColumn.map((order) => (
                                    <Card
                                        key={order._id}
                                        order={order}
                                        onAdvance={onAdvance}
                                        isNew={fresh.includes(order._id)}
                                        kiosk={kiosk}
                                        now={now}
                                    />
                                ))}
                            </section>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
