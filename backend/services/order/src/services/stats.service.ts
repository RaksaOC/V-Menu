import { parse } from "@vmenu/common";
import { DateRangeQuery, type MenuCounts, type TopSeller } from "@vmenu/contracts";
import type { BoundClients } from "../clients/index.js";
import type { BillRecord, BillsRepo } from "../repositories/bills.repo.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** VM-09: ?from=&to= (both optional), checked: a 400 names a bad date. */
function period(query: unknown) {
    const range = parse(DateRangeQuery, query ?? {});
    return { range, from: range.from?.toISOString() ?? null, to: range.to?.toISOString() ?? null };
}

/** menu-service still says numOfX between the services; the dashboards say xCount (VM-09). */
const tableCounts = (c: MenuCounts) => ({ tableCount: c.numOfTables, activeTableCount: c.numOfActiveTables, itemCount: c.numOfItems });

/**
 * VM-09: what was sold, from paid bills only. Cancelled orders count nowhere (VM-27). Money is in
 * whole cents (CL-07). Top sellers are grouped by dish id, shown with the dish's most recent name.
 */
export function sales(paid: BillRecord[]) {
    let revenueCents = 0;
    let itemsSoldCount = 0;
    let orderCount = 0;
    const sold = new Map<string, TopSeller & { at: number }>();
    for (const bill of paid) {
        for (const order of bill.orders) {
            if (!order || order.status === "cancelled") continue;
            orderCount++;
            const at = new Date(order.createdAt).getTime();
            for (const { item, quantity } of order.orderedItems) {
                if (!item) continue;
                revenueCents += (item.priceCents ?? 0) * quantity;
                itemsSoldCount += quantity;
                const id = String(item._id);
                const seen = sold.get(id) ?? { _id: id, name: item.name, quantity: 0, at };
                seen.quantity += quantity;
                if (at >= seen.at) Object.assign(seen, { name: item.name, at });
                sold.set(id, seen);
            }
        }
    }
    return {
        revenueCents,
        itemsSoldCount,
        avgItemsPerOrder: orderCount > 0 ? Number((itemsSoldCount / orderCount).toFixed(2)) : 0,
        topSellingItems: [...sold.values()]
            .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
            .slice(0, 5)
            .map(({ _id, name, quantity }) => ({ _id, name, quantity })),
    };
}

/** The numbers on the cashier and owner dashboards. */
export function statsService({ orders, bills, clients }: { orders: OrdersRepo; bills: BillsRepo; clients: BoundClients }) {
    /** One restaurant: its counts, and its revenue in the period. */
    async function restaurantOverview(resId: string, query?: unknown) {
        const { range, from, to } = period(query);
        const [counts, orderCount, unpaidBillCount, paid] = await Promise.all([
            clients.menuCounts(resId),
            orders.countFor([resId], range),
            bills.countOpen([resId]),
            bills.listPaid([resId], range),
        ]);
        return {
            ...tableCounts(counts),
            orderCount,
            unpaidBillCount,
            paymentCount: paid.length,
            revenueCents: sales(paid).revenueCents,
            from,
            to,
        };
    }

    return {
        restaurantOverview,

        /** Each of the owner's restaurants with its numbers. */
        async ownerRestaurants(ownerId: string, query?: unknown) {
            period(query); // a bad date is a 400 before anything is asked
            const list = await clients.listOwnerRestaurants(ownerId);
            return Promise.all(list.map(async (r) => ({ resId: r._id, resName: r.name, ...(await restaurantOverview(r._id, query)) })));
        },

        /** Totals across all the owner's restaurants, in the period. */
        async ownerOverview(ownerId: string, query?: unknown) {
            const { range, from, to } = period(query);
            const resIds = (await clients.listOwnerRestaurants(ownerId)).map((r) => r._id);
            const [unpaidBillCount, orderCount, paid, counts] = await Promise.all([
                bills.countOpen(resIds),
                orders.countFor(resIds, range),
                bills.listPaid(resIds, range),
                Promise.all(resIds.map((id) => clients.menuCounts(id))),
            ]);
            return {
                unpaidBillCount,
                itemCount: counts.reduce((n, c) => n + c.numOfItems, 0),
                orderCount,
                paymentCount: paid.length,
                ...sales(paid),
                from,
                to,
            };
        },
    };
}
