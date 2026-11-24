import { TrendingUp } from "lucide-react";
import type { RestaurantSummary } from "@/features/owner/api";
import { useMoney } from "@/components/money/MoneyProvider";

/** Occupancy, payment completion and revenue for one restaurant. */
export function RestaurantInsights({ restaurant }: { restaurant: RestaurantSummary }) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                    <TrendingUp size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{restaurant.resName} Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                    <p className="text-gray-600">Table Occupancy</p>
                    <p className="text-lg font-bold text-blue-600">
                        {restaurant.tableCount > 0 ? Math.round((restaurant.activeTableCount / restaurant.tableCount) * 100) : 0}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-gray-600">Payment Completion</p>
                    <p className="text-lg font-bold text-green-600">
                        {restaurant.orderCount > 0 ? Math.round((restaurant.paymentCount / restaurant.orderCount) * 100) : 0}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-gray-600">Revenue (paid bills)</p>
                    <p className="text-lg font-bold text-amber-600">{money(restaurant.revenueCents)}</p>
                </div>
            </div>
        </div>
    );
}
