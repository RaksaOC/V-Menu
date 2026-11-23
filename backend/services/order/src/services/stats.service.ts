import type { BoundClients } from "../clients/index.js";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** The numbers on the cashier and owner dashboards. */
export function statsService({ orders, bills, clients }: { orders: OrdersRepo; bills: BillsRepo; clients: BoundClients }) {
    /** The six numbers for one restaurant. */
    async function restaurantOverview(resId: string) {
        const [counts, numOfOrders, numOfUnpaidOrders, numOfPayments] = await Promise.all([
            clients.menuCounts(resId),
            orders.countFor([resId]),
            bills.countFor([resId], false),
            bills.countFor([resId], true),
        ]);
        return { ...counts, numOfOrders, numOfUnpaidOrders, numOfPayments };
    }

    return {
        restaurantOverview,

        /** Each of the owner's restaurants with its numbers. */
        async ownerRestaurants(ownerId: string) {
            const list = await clients.listOwnerRestaurants(ownerId);
            return Promise.all(list.map(async (r) => ({ resId: r._id, resName: r.name, ...(await restaurantOverview(r._id)) })));
        },

        /** Totals across all the owner's restaurants. Money and items count finished orders only. */
        async ownerOverview(ownerId: string) {
            const resIds = (await clients.listOwnerRestaurants(ownerId)).map((r) => r._id);
            const [numOfUnpaidOrders, numOfPayments, numOfOrders, done, counts] = await Promise.all([
                bills.countFor(resIds, false),
                bills.countFor(resIds, true),
                orders.countFor(resIds),
                orders.listDone(resIds),
                Promise.all(resIds.map((id) => clients.menuCounts(id))),
            ]);
            let numOfMoneyEarned = 0;
            let totalItemsSold = 0;
            const sold = new Map<string, number>();
            for (const order of done) {
                for (const line of order.orderedItems) {
                    if (!line.item?.price) continue;
                    numOfMoneyEarned += line.item.price * line.quantity;
                    totalItemsSold += line.quantity;
                    sold.set(line.item.name, (sold.get(line.item.name) ?? 0) + line.quantity);
                }
            }
            return {
                numOfUnpaidOrders,
                numOfItems: counts.reduce((n, c) => n + c.numOfItems, 0),
                numOfOrders,
                numOfPayments,
                numOfMoneyEarned,
                totalItemsSold,
                avgItemsPerOrder: numOfOrders > 0 ? Number((totalItemsSold / numOfOrders).toFixed(2)) : 0,
                topSellingItems: [...sold.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, quantity]) => ({ name, quantity })),
            };
        },
    };
}
