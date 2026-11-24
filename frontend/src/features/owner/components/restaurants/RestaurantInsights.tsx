import { TrendingUp } from "lucide-react";
import type { RestaurantSummary } from "@/features/owner/api";
import { useMoney } from "@/components/money/MoneyProvider";

/** Occupancy, payment completion and revenue for one restaurant. */
export function RestaurantInsights({ restaurant }: { restaurant: RestaurantSummary }) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    return (
        <div className="bg-[var(--bg)] rounded-2xl p-6 border-2 border-[var(--accent)]">
            <div className="flex items-center space-x-3 mb-3">
                <div className="bg-[var(--btn-bg)] p-2 rounded-lg">
                    <TrendingUp size={20} aria-hidden className="text-[var(--btn-ink)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--ink)]">{restaurant.resName} Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                    <p className="text-[var(--body)]">Table Occupancy</p>
                    <p className="text-lg font-bold text-[var(--accent-text)]">
                        {restaurant.tableCount > 0 ? Math.round((restaurant.activeTableCount / restaurant.tableCount) * 100) : 0}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[var(--body)]">Payment Completion</p>
                    <p className="text-lg font-bold text-[var(--ok)]">
                        {restaurant.orderCount > 0 ? Math.round((restaurant.paymentCount / restaurant.orderCount) * 100) : 0}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[var(--body)]">Revenue (paid bills)</p>
                    <p className="text-lg font-bold text-[var(--accent-text)]">{money(restaurant.revenueCents)}</p>
                </div>
            </div>
        </div>
    );
}
