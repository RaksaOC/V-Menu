import OrderCard from "./OrderCard";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui";
import ConnectionLostBar from "@/components/ui/ConnectionLostBar";
import { getOpenBills, getPaidBills, setBillPaid, type PaidBillsPage } from "@/features/cashier/api";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useConnectionStatus } from "@/lib/useConnectionStatus";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, RefreshCw, ShoppingCart } from "lucide-react";
import type { Bill } from "@vmenu/contracts";

/** VM-11: the open bills refresh themselves this often. */
export const BILLS_POLL_MS = 10_000;

function ago(ms: number) {
    const s = Math.floor(ms / 1000);
    if (s < 2) return "Updated just now";
    if (s < 60) return `Updated ${s} s ago`;
    return `Updated ${Math.floor(s / 60)} min ago`;
}

export default function Orders({ pollMs = BILLS_POLL_MS }: { pollMs?: number } = {}) {
    const params = useParams();
    const slug = String(params.res);
    const connection = useConnectionStatus();

    // ---- open bills, kept up to date
    const [orders, setOrders] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [fresh, setFresh] = useState<Set<string>>(new Set());
    const seen = useRef<Map<string, number> | null>(null); // bill id -> how many orders it had

    const loadOpen = useCallback(async () => {
        try {
            const bills = (await getOpenBills(slug)).filter((b) => b.orders.length > 0);
            const before = seen.current;
            if (before) {
                // a bill we hadn't seen, or one with more orders than before, is NEW
                const added = bills.filter((b) => (before.get(b._id) ?? 0) < b.orders.length).map((b) => b._id);
                if (added.length) setFresh((prev) => new Set([...prev, ...added]));
            }
            seen.current = new Map(bills.map((b) => [b._id, b.orders.length]));
            setOrders(bills);
            setUpdatedAt(Date.now());
            setNow(Date.now());
            connection.succeeded();
        } catch (err) {
            connection.failed(); // the red bar after 2 failures in a row (VM-03)
            console.error("Failed to load the open bills:", err);
        } finally {
            setIsLoading(false);
        }
    }, [slug, connection.succeeded, connection.failed]);

    useEffect(() => {
        loadOpen();
        const poll = setInterval(loadOpen, pollMs);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            clearInterval(poll);
            clearInterval(tick);
        };
    }, [loadOpen, pollMs]);

    const markSeen = (id: string) =>
        setFresh((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

    const handleMarkPaid = async (billId: string) => {
        const bill = orders.find((o) => o._id === billId);
        if (!bill) return;
        try {
            await setBillPaid(slug, billId, !bill.isPayed);
            markSeen(billId);
            toast.success(`Table ${bill.table} paid`);
            await loadOpen();
        } catch (err) {
            toast.error(apiErrorMessage(err, "Couldn't mark the bill paid. Try again."));
        }
    };

    // ---- paid bills, a page at a time
    const [showHistory, setShowHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [history, setHistory] = useState<PaidBillsPage | null>(null);
    useEffect(() => {
        if (!showHistory) return;
        getPaidBills(slug, historyPage)
            .then(setHistory)
            .catch((err) => toast.error(apiErrorMessage(err, "Couldn't load the paid bills.")));
    }, [slug, showHistory, historyPage]);

    return (
        <div className="orders w-full flex justify-center items-center">
            <div className={"orders-wrapper w-full text-center flex flex-col gap-6"}>
                {connection.lost && <ConnectionLostBar />}
                <div className={"order-orderHistory w-full flex flex-wrap gap-3 justify-between items-center p-4"}>
                    <div className="flex items-center space-x-2 text-lg font-semibold ">
                        {showHistory ? <Clock size={20} /> : <ShoppingCart size={20} />}
                        <p>{showHistory ? "Order History" : "Active Orders"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {!showHistory && (
                            <>
                                <span className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
                                    {updatedAt !== null ? ago(now - updatedAt) : ""}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => loadOpen()}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-600"
                                >
                                    <RefreshCw size={16} aria-hidden /> Refresh
                                </button>
                            </>
                        )}
                        <button
                            className={"bg-blue-600 text-white py-2 px-4 rounded-xl cursor-pointer "}
                            onClick={() => {
                                setShowHistory(!showHistory);
                                setHistoryPage(1);
                            }}
                        >
                            {showHistory ? "View Active Orders" : "View Order History"}
                        </button>
                    </div>
                </div>

                {!showHistory ? (
                    <>
                        {isLoading && <Skeleton variant="order" count={3} className="contents" />}
                        {!isLoading &&
                            (orders.length > 0 ? (
                                orders.map((order) => (
                                    <OrderCard
                                        key={order._id}
                                        order={order}
                                        onMarkPaid={handleMarkPaid}
                                        isNew={fresh.has(order._id)}
                                        onSeen={markSeen}
                                    />
                                ))
                            ) : (
                                <div className={"w-full h-96 flex justify-center items-center"}>
                                    <h1 className={"text-3xl text-center"}>No orders to display</h1>
                                </div>
                            ))}
                    </>
                ) : (
                    <>
                        {history && history.bills.length > 0 ? (
                            history.bills.map((bill) => <OrderCard key={bill._id} order={bill} onMarkPaid={() => {}} />)
                        ) : (
                            <div className={"w-full h-96 flex justify-center items-center"}>
                                <h1 className={"text-3xl text-center"}>{history ? "No orders history to display" : "Loading…"}</h1>
                            </div>
                        )}
                        {history && history.total > 0 && (
                            <nav
                                aria-label="History pages"
                                className="flex w-full items-center justify-between gap-4 px-4 pb-6 text-slate-700 dark:text-slate-200"
                            >
                                <button
                                    type="button"
                                    onClick={() => setHistoryPage((p) => p - 1)}
                                    disabled={historyPage <= 1}
                                    className="flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 font-medium disabled:opacity-40 dark:border-slate-600"
                                >
                                    <ChevronLeft size={18} aria-hidden /> Previous
                                </button>
                                <p className="text-sm">
                                    Page {history.page} of {history.pages}
                                    <span className="block text-slate-500 dark:text-slate-400">{history.total} paid bills</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setHistoryPage((p) => p + 1)}
                                    disabled={historyPage >= history.pages}
                                    className="flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 font-medium disabled:opacity-40 dark:border-slate-600"
                                >
                                    Next <ChevronRight size={18} aria-hidden />
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
