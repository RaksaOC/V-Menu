import api, { seg } from "@/lib/api";
import type { OwnerOverview, OwnerRestaurantOverview, Restaurant } from "@vmenu/contracts";

export type { OwnerOverview, TopSeller } from "@vmenu/contracts";

/** One restaurant's numbers, for the "All restaurants" list. */
export type RestaurantSummary = OwnerRestaurantOverview;

/** VM-09: the periods the owner can pick. "all" asks for no range. */
export const PERIODS = [
    { id: "today", label: "Today", days: 1 },
    { id: "7d", label: "7 days", days: 7 },
    { id: "30d", label: "30 days", days: 30 },
    { id: "all", label: "All time", days: 0 },
] as const;
export type Period = (typeof PERIODS)[number]["id"];

/** ?from= for a period: midnight (the browser's time) at the start of its first day; nothing for "all". */
export function periodQuery(period: Period, now = new Date()): { from?: string } {
    const days = PERIODS.find((p) => p.id === period)!.days;
    if (!days) return {};
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    return { from: start.toISOString() };
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

export async function getOwnerOverview(period: Period = "all"): Promise<OwnerOverview> {
    const { data } = await api.get<OwnerOverview>("/api/orders/owner/overview", { params: periodQuery(period) });
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
