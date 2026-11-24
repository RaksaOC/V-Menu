import { AlertTriangle, CheckCircle, CreditCard, Table, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { RestaurantSummary } from "@/features/owner/api";

export interface RestaurantCard {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    textColor: string;
    priority: "high" | "urgent" | "normal";
}

/** The six figures shown for each restaurant on the owner's "All Restaurants" page. */
export function restaurantCards(restaurantData: RestaurantSummary): RestaurantCard[] {
    return [
        {
            label: "Active Tables",
            value: restaurantData.activeTableCount,
            icon: Users,
            color: "from-emerald-500 to-teal-600",
            bgColor: "bg-emerald-50",
            textColor: "text-emerald-700",
            priority: "high",
        },
        {
            label: "Unpaid Bills",
            value: restaurantData.unpaidBillCount,
            icon: AlertTriangle,
            color: "from-amber-500 to-orange-600",
            bgColor: "bg-amber-50",
            textColor: "text-amber-700",
            priority: "urgent",
        },
        {
            label: "Total Tables",
            value: restaurantData.tableCount,
            icon: Table,
            color: "from-blue-500 to-indigo-600",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            priority: "normal",
        },
        {
            label: "Menu Items",
            value: restaurantData.itemCount,
            icon: UtensilsCrossed,
            color: "from-purple-500 to-violet-600",
            bgColor: "bg-purple-50",
            textColor: "text-purple-700",
            priority: "normal",
        },
        {
            label: "Orders",
            value: restaurantData.orderCount,
            icon: CheckCircle,
            color: "from-green-500 to-emerald-600",
            bgColor: "bg-green-50",
            textColor: "text-green-700",
            priority: "normal",
        },
        {
            label: "Payments Completed",
            value: restaurantData.paymentCount,
            icon: CreditCard,
            color: "from-cyan-500 to-blue-600",
            bgColor: "bg-cyan-50",
            textColor: "text-cyan-700",
            priority: "normal",
        },
    ];
}
