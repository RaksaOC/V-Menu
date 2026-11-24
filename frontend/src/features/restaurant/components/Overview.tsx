"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, CreditCard, Table as TableIcon, TrendingUp, Users, UtensilsCrossed } from "lucide-react";
import { Card, Skeleton } from "@/components/ui";
import { getOverview } from "@/features/restaurant/api";
import { useRestaurantSlug } from "@/features/restaurant/useRestaurantSlug";
import type { Overview as OverviewData } from "@vmenu/contracts";

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** One restaurant's numbers, the same for the owner and the cashier (CL-09; was two copies). */
export default function Overview() {
    const slug = useRestaurantSlug();
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        getOverview(slug)
            .then(setData)
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <Skeleton variant="overview" count={6} />;
    if (!data) {
        return (
            <div className="flex flex-col items-center py-16 text-center text-[var(--muted)]">
                <TrendingUp size={32} aria-hidden className="mb-3" />
                <h3 className="text-lg font-semibold text-[var(--ink)]">No data yet</h3>
                <p className="text-sm">The numbers appear once the restaurant has tables and orders.</p>
            </div>
        );
    }

    const tables = data.numOfTables ?? 0;
    const cards = [
        { label: "Active Tables", value: data.numOfActiveTables ?? 0, icon: Users, of: tables },
        { label: "Unpaid Orders", value: data.numOfUnpaidOrders ?? 0, icon: AlertTriangle, of: tables, urgent: true },
        { label: "Total Tables", value: tables, icon: TableIcon },
        { label: "Menu Items", value: data.numOfItems ?? 0, icon: UtensilsCrossed },
        { label: "Orders Completed", value: data.numOfOrders ?? 0, icon: CheckCircle },
        { label: "Payments Completed", value: data.numOfPayments ?? 0, icon: CreditCard },
    ];

    return (
        <div className="w-full space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-[var(--ink)]">Overview</h2>
                <p className="text-sm text-[var(--muted)]">Today&apos;s tables, orders and payments</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cards.map(({ label, value, icon: Icon, of, urgent }) => (
                    <Card key={label} className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
                                <p className="mt-1 text-3xl font-bold">{value}</p>
                            </div>
                            <span
                                className={`rounded-[var(--r-chip)] p-2.5 ${urgent && value > 0 ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "bg-[var(--card)] text-[var(--ink)]"}`}
                            >
                                <Icon size={22} aria-hidden />
                            </span>
                        </div>
                        {of !== undefined && (
                            <div>
                                <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                                    <span>of all tables</span>
                                    <span>
                                        {value} / {of}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-[var(--card)]">
                                    <div
                                        className="h-2 rounded-full bg-[var(--accent)]"
                                        style={{ width: `${Math.min(pct(value, of), 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
            <Card className="grid gap-4 sm:grid-cols-3">
                <div>
                    <p className="text-sm text-[var(--muted)]">Table Occupancy</p>
                    <p className="text-lg font-bold">{pct(data.numOfActiveTables ?? 0, tables)}%</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--muted)]">Payment Completion</p>
                    <p className="text-lg font-bold">{pct(data.numOfPayments ?? 0, data.numOfOrders ?? 0)}%</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--muted)]">Pending Actions</p>
                    <p className="text-lg font-bold">{data.numOfUnpaidOrders ?? 0}</p>
                </div>
            </Card>
        </div>
    );
}
