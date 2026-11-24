"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { Order } from "@vmenu/contracts";
import { ThemeToggle } from "@/components/marketing/tour/ThemeToggle";
import { BAND_BUTTON } from "@/features/kitchen/band";
import { KITCHEN_THEME_KEY } from "@/theme/ThemeSync";
import { getKitchenHistory, type KitchenHistoryPage } from "@/features/kitchen/api";
import KitchenSignOut from "@/features/kitchen/components/KitchenSignOut";
import Card from "@/features/kitchen/components/OrderCard";

export default function History() {
    const router = useRouter();
    const params = useParams();
    // VM-10: one page of finished orders at a time, newest first
    const [page, setPage] = useState(1);
    const [data, setData] = useState<KitchenHistoryPage | null>(null);
    useEffect(() => {
        getKitchenHistory(String(params.res), page)
            .then(setData)
            .catch((err) => console.error("Failed to load the kitchen history:", err));
    }, [params.res, page]);
    const orders: Order[] = data?.orders ?? [];
    const pages = data?.pages ?? 1;

    const pagerButton =
        "flex min-h-11 items-center gap-1 rounded-[var(--r-chip)] border border-[var(--line)] px-4 font-medium hover:bg-[var(--card)] disabled:opacity-40";
    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
            <header className="vm-band px-4 py-5 sm:px-6">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-[family-name:var(--f-display)] text-3xl font-semibold tracking-[var(--d-track)]">
                            Kitchen History
                        </h1>
                        <p className="mt-1 font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-white/80">
                            Served and cancelled orders
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => router.push(`/${params.res}/kitchen`)} className={BAND_BUTTON}>
                            <ArrowLeft size={18} aria-hidden />
                            View Orders
                        </button>
                        <ThemeToggle storageKey={KITCHEN_THEME_KEY} className={BAND_BUTTON} />
                        <KitchenSignOut slug={String(params.res)} />
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                {orders.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {orders.map((order) => (
                            <Card key={order._id} order={order} />
                        ))}
                    </div>
                ) : (
                    <p className="py-16 text-center text-[var(--muted)]">No Orders To Display</p>
                )}
                {data && data.total > 0 && (
                    <nav aria-label="History pages" className="flex w-full items-center justify-between gap-4 py-6">
                        <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className={pagerButton}>
                            <ChevronLeft size={18} aria-hidden /> Previous
                        </button>
                        <p className="text-center font-[family-name:var(--f-mono)] text-sm">
                            Page {data.page} of {pages}
                            <span className="block text-[var(--muted)]">{data.total} finished orders</span>
                        </p>
                        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= pages} className={pagerButton}>
                            Next <ChevronRight size={18} aria-hidden />
                        </button>
                    </nav>
                )}
            </main>
        </div>
    );
}
