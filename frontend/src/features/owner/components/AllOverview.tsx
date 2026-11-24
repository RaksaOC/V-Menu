import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, DollarSign, Package, ShoppingCart, Target, TrendingUp, Users } from "lucide-react";
import { getOwnerOverview, PERIODS, type OwnerOverview, type Period } from "@/features/owner/api";
import { useMoney } from "@/components/money/MoneyProvider";
import { MetricsChart } from "./all-overview/MetricsChart";
import { OverviewSkeleton } from "./all-overview/OverviewSkeleton";
import { StatCard } from "./all-overview/StatCard";
import { TopSellingChart } from "./all-overview/TopSellingChart";

/** The owner's figures across all their restaurants, for a period (VM-09). */
export default function AllOverview() {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const [data, setData] = useState<OwnerOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cardsVisible, setCardsVisible] = useState(false);
    const [period, setPeriod] = useState<Period>("all"); // VM-09

    useEffect(() => {
        const fetchData = async () => {
            try {
                setData(await getOwnerOverview(period));

                // Trigger card animations after data loads
                setTimeout(() => setCardsVisible(true), 100);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [period]);

    if (isLoading) return <OverviewSkeleton />;
    if (!data) return null;

    const paymentRate = data.orderCount > 0 ? (data.paymentCount / data.orderCount) * 100 : 0;
    const cards = [
        { title: "Revenue", value: money(data.revenueCents), icon: DollarSign },
        { title: "Total Orders", value: data.orderCount, icon: ShoppingCart },
        { title: "Unpaid Bills", value: data.unpaidBillCount, icon: AlertTriangle },
        { title: "Payments", value: data.paymentCount, icon: CreditCard },
        { title: "Menu Items", value: data.itemCount, icon: Package },
        { title: "Items Sold", value: data.itemsSoldCount, icon: Target },
        {
            title: "Avg Items/Order",
            value: data.avgItemsPerOrder.toFixed(1),
            icon: TrendingUp,
        },
        { title: "Payment Rate", value: `${paymentRate.toFixed(1)}%`, icon: Users },
    ];

    return (
        <div className="min-h-screen">
            <div className="w-full mx-auto">
                <div
                    className={`
 mb-8 transition-all duration-1000 ease-out 
 ${cardsVisible ? " opacity-100" : " opacity-0"}
 `}
                >
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-[var(--ink)] mb-2">Dashboard Overview</h1>
                            <p className="text-[var(--body)] text-sm">Revenue and items sold come from paid bills</p>
                        </div>
                        <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={period === p.id}
                                    onClick={() => setPeriod(p.id)}
                                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                                        period === p.id
                                            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                                            : "border-[var(--line)] text-[var(--ink)] hover:bg-[var(--card)]"
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {cards.map((card) => (
                        <StatCard
                            key={card.title}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            isUrgent={card.title === "Unpaid Bills" && data.unpaidBillCount > 0}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TopSellingChart data={data.topSellingItems} isVisible={cardsVisible} />
                    <MetricsChart data={data} isVisible={cardsVisible} />
                </div>
            </div>
        </div>
    );
}
