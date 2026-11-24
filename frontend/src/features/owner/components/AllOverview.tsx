import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, DollarSign, Package, ShoppingCart, Target, TrendingUp, Users } from "lucide-react";
import { getOwnerOverview, PERIODS, type OwnerOverview, type Period } from "@/features/owner/api";
import { useMoney } from "@/components/money/MoneyProvider";
import { MetricsChart } from "./overview/MetricsChart";
import { OverviewSkeleton } from "./overview/OverviewSkeleton";
import { StatCard } from "./overview/StatCard";
import { TopSellingChart } from "./overview/TopSellingChart";

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
        { title: "Revenue", value: money(data.revenueCents), icon: DollarSign, tone: "green", color: "from-green-500 to-emerald-600" },
        { title: "Total Orders", value: data.orderCount, icon: ShoppingCart, tone: "blue", color: "from-blue-500 to-indigo-600" },
        { title: "Unpaid Bills", value: data.unpaidBillCount, icon: AlertTriangle, tone: "amber", color: "from-amber-500 to-orange-600" },
        { title: "Payments", value: data.paymentCount, icon: CreditCard, tone: "cyan", color: "from-cyan-500 to-blue-600" },
        { title: "Menu Items", value: data.itemCount, icon: Package, tone: "purple", color: "from-purple-500 to-violet-600" },
        { title: "Items Sold", value: data.itemsSoldCount, icon: Target, tone: "pink", color: "from-pink-500 to-rose-600" },
        {
            title: "Avg Items/Order",
            value: data.avgItemsPerOrder.toFixed(1),
            icon: TrendingUp,
            tone: "indigo",
            color: "from-indigo-500 to-purple-600",
        },
        { title: "Payment Rate", value: `${paymentRate.toFixed(1)}%`, icon: Users, tone: "teal", color: "from-teal-500 to-cyan-600" },
    ];

    return (
        <div className="min-h-screen">
            <div className="w-full mx-auto">
                <div
                    className={`
          mb-8 transition-all duration-1000 ease-out transform
          ${cardsVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
                >
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
                            <p className="text-gray-600 text-sm">Revenue and items sold come from paid bills</p>
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
                    {cards.map((card, i) => (
                        <StatCard
                            key={card.title}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            color={card.color}
                            bgColor={TONES[card.tone][0]}
                            textColor={TONES[card.tone][1]}
                            isUrgent={card.title === "Unpaid Bills" && data.unpaidBillCount > 0}
                            delay={i * 100}
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

// Written out in full so Tailwind finds the class names.
const TONES: Record<string, [string, string]> = {
    green: ["bg-green-50", "text-green-700"],
    blue: ["bg-blue-50", "text-blue-700"],
    amber: ["bg-amber-50", "text-amber-700"],
    cyan: ["bg-cyan-50", "text-cyan-700"],
    purple: ["bg-purple-50", "text-purple-700"],
    pink: ["bg-pink-50", "text-pink-700"],
    indigo: ["bg-indigo-50", "text-indigo-700"],
    teal: ["bg-teal-50", "text-teal-700"],
};
