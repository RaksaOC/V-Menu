"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, CreditCard, Table as TableIcon, TrendingUp, Users, UtensilsCrossed } from "lucide-react";
import type { Overview as OverviewData } from "@vmenu/contracts";
import { Card, Skeleton } from "@/components/ui";
import { getOverview } from "@/features/restaurant/api";
import { useRestaurantSlug } from "@/features/restaurant/use-restaurant-slug";
import { useMoney } from "@/components/money/MoneyProvider";

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** One restaurant's numbers, the same for the owner and the cashier (CL-09; was two copies). */
export default function Overview() {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
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

    const tables = data.tableCount ?? 0;
    const cards = [
        { label: "Active Tables", value: data.activeTableCount ?? 0, icon: Users, of: tables },
        { label: "Unpaid Bills", value: data.unpaidBillCount ?? 0, icon: AlertTriangle, of: tables, urgent: true },
        { label: "Total Tables", value: tables, icon: TableIcon },
        { label: "Menu Items", value: data.itemCount ?? 0, icon: UtensilsCrossed },
        { label: "Orders", value: data.orderCount ?? 0, icon: CheckCircle },
        { label: "Payments Completed", value: data.paymentCount ?? 0, icon: CreditCard },
    ];

    return (
        <div className="w-full space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-[var(--ink)]">Overview</h2>
                <p className="text-sm text-[var(--muted)]">Tables right now; orders, payments and revenue so far</p>
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
                    <p className="text-lg font-bold">{pct(data.activeTableCount ?? 0, tables)}%</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--muted)]">Payment Completion</p>
                    <p className="text-lg font-bold">{pct(data.paymentCount ?? 0, data.orderCount ?? 0)}%</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--muted)]">Revenue (paid bills)</p>
                    <p className="text-lg font-bold">{money(data.revenueCents ?? 0)}</p>
                </div>
            </Card>
        </div>
    );
}
