import api, { seg } from "@/lib/api";
import type { Overview, Restaurant } from "@vmenu/contracts";

export interface TopItem {
    name: string;
    quantity: number;
}

/** Totals across all of the owner's restaurants. */
export interface OwnerOverview {
    numOfUnpaidOrders: number;
    numOfItems: number;
    numOfOrders: number;
    numOfPayments: number;
    numOfMoneyEarned: number;
    totalItemsSold: number;
    avgItemsPerOrder: number;
    topSellingItems: TopItem[];
}

/** One restaurant's numbers, for the "All restaurants" list. */
export interface RestaurantSummary extends Overview {
    resId: string;
    resName: string;
}

export async function getRestaurants(): Promise<Restaurant[]> {
    const { data } = await api.get<Restaurant[]>("/api/restaurants");
    return data;
}

/** Creates a restaurant and returns the owner's restaurants, the new one last. */
export async function createRestaurant(name: string): Promise<Restaurant[]> {
    const { data } = await api.post<Restaurant[]>("/api/restaurants", { name });
    return data;
}

export async function getOwnerOverview(): Promise<OwnerOverview> {
    const { data } = await api.get<OwnerOverview>("/api/orders/owner/overview");
    return data;
}

export async function getRestaurantSummaries(): Promise<RestaurantSummary[]> {
    const { data } = await api.get<RestaurantSummary[]>("/api/orders/owner/restaurants");
    return data;
}

export {
    getOverview,
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getTables,
    createTable,
    updateTable,
    deleteTable,
    uploadMenuPhoto,
} from "@/features/restaurant/api";
