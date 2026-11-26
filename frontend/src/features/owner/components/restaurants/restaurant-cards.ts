import { AlertTriangle, CheckCircle, CreditCard, Table, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { RestaurantSummary } from "@/features/owner/api";

export interface RestaurantCard {
    label: string;
    value: number;
    icon: LucideIcon;
    priority: "high" | "urgent" | "normal";
}

/** The six figures shown for each restaurant on the owner's "All Restaurants" page. */
export function restaurantCards(restaurantData: RestaurantSummary): RestaurantCard[] {
    return [
        {
            label: "Active Tables",
            value: restaurantData.activeTableCount,
            icon: Users,
            priority: "high",
        },
        {
            label: "Unpaid Bills",
            value: restaurantData.unpaidBillCount,
            icon: AlertTriangle,
            priority: "urgent",
        },
        {
            label: "Total Tables",
            value: restaurantData.tableCount,
            icon: Table,
            priority: "normal",
        },
        {
            label: "Menu Items",
            value: restaurantData.itemCount,
            icon: UtensilsCrossed,
            priority: "normal",
        },
        {
            label: "Orders",
            value: restaurantData.orderCount,
            icon: CheckCircle,
            priority: "normal",
        },
        {
            label: "Payments Completed",
            value: restaurantData.paymentCount,
            icon: CreditCard,
            priority: "normal",
        },
    ];
}
