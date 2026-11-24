import { ChefHat } from "lucide-react";
import type { Order, OrderStatus } from "@vmenu/contracts";
import { STATUS_LABEL } from "@/lib/order-status";
import Card from "./OrderCard";

// VM-27: the board's columns
const COLUMNS: OrderStatus[] = ["pending", "preparing", "ready"];
const byAge = (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/** The orders in New / Preparing / Ready columns, oldest first, or "All caught up!". */
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
        <main className={kiosk ? "px-4 py-4" : "px-4 sm:px-6 py-8"}>
            <div className={kiosk ? "w-full" : "max-w-7xl mx-auto"}>
                {orders.length > 0 ? (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {COLUMNS.map((status) => {
                            const inColumn = sorted.filter((o) => o.status === status);
                            return (
                                <section key={status} aria-label={STATUS_LABEL[status]} className="min-w-0 space-y-4">
                                    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
                                        <h2 className={`font-bold text-gray-800 ${kiosk ? "text-3xl" : "text-xl"}`}>
                                            {STATUS_LABEL[status]}
                                        </h2>
                                        <span className="rounded-full bg-slate-700 px-3 py-0.5 text-sm font-bold text-white">
                                            {inColumn.length}
                                        </span>
                                    </div>
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
                ) : (
                    <div className="text-center py-20">
                        <div className="max-w-md mx-auto">
                            <div className="p-8 bg-gray-100 rounded-full w-40 h-40 mx-auto mb-6 flex items-center justify-center">
                                <ChefHat size={64} className="text-gray-400" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-700 mb-3">All caught up!</h2>
                            <p className="text-gray-500 text-lg mb-6">No pending orders at the moment</p>
                            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="font-medium">Waiting for new orders...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
