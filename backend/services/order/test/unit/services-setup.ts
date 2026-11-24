import { HttpError } from "@vmenu/common";
import { billsService } from "../../src/services/bills.service.js";
import { kitchenService } from "../../src/services/kitchen.service.js";
import { ordersService } from "../../src/services/orders.service.js";
import { statsService } from "../../src/services/stats.service.js";
import { tableService } from "../../src/services/table.service.js";
import { DISH, fakeBills, fakeClients, fakeOrders } from "./fakes.js";

// CL-04: the business rules, with in-memory repositories (no MongoDB, no HTTP).
export function setup(clientOverrides = {}) {
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    const clients = fakeClients(clientOverrides);
    return {
        orders,
        bills,
        clients,
        placing: ordersService({ orders, bills, clients }),
        kitchen: kitchenService({ orders }),
        billing: billsService({ bills, orders }),
        stats: statsService({ orders, bills, clients }),
        tableView: tableService({ orders, bills }),
    };
}
export const status = async (p: Promise<unknown>) => {
    try {
        await p;
        return 0;
    } catch (e) {
        return e instanceof HttpError ? e.status : ((e as { status?: number }).status ?? -1);
    }
};
export const line = (quantity = 1, price = 0) => ({ item: { _id: DISH._id, price }, quantity });
/** VM-27: what "done" used to mean: the kitchen takes the order to served, step by step. */
export async function serve(kitchen: ReturnType<typeof kitchenService>, resId: string, id: string) {
    let order;
    for (const status of ["preparing", "ready", "served"] as const) order = await kitchen.setStatus(resId, id, { status }, "chef");
    return order!;
}
