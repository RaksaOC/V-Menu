import api, { seg } from "@/lib/api";
import type { TableOrderOutput } from "@/lib/types/TableOrder";

/** Every bill of the restaurant, paid and unpaid. */
export async function getBills(slug: string): Promise<TableOrderOutput[]> {
    const { data } = await api.get<TableOrderOutput[]>(`/api/orders/${seg(slug)}/bills`);
    return data;
}

export async function setBillPaid(slug: string, billId: string, isPayed: boolean): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/bills/${seg(billId)}`, { isPayed });
}

export { getTables, setTableAvailability, getMenuItems, setItemAvailability, getOverview } from "@/features/restaurant/api";
