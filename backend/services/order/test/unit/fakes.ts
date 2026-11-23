// In-memory repositories and clients for the service unit tests (CL-04): no MongoDB, no HTTP.
import type { BillRecord, BillsRepo } from "../../src/repositories/bills.repo.js";
import type { OrderRecord, OrdersRepo } from "../../src/repositories/orders.repo.js";
import type { BoundClients } from "../../src/clients/index.js";

let seq = 0;
export const newId = () => (++seq).toString(16).padStart(24, "0");

export function fakeOrders(): OrdersRepo & { all: OrderRecord[] } {
    const all: OrderRecord[] = [];
    let clock = 0;
    const inRes = (resIds: string[]) => (o: OrderRecord) => resIds.includes(o.resId);
    return {
        all,
        async create({ table, orderedItems, resId }) {
            const at = new Date(Date.UTC(2026, 0, 1, 0, 0, clock++));
            const order = {
                _id: newId(),
                table,
                orderedItems,
                resId,
                status: "pending" as const,
                statusHistory: [{ status: "pending" as const, at, by: "customer" }],
                orderedAt: at,
                createdAt: at,
            };
            all.push(order);
            return order;
        },
        async countFor(resIds) {
            return all.filter(inRes(resIds)).filter((o) => o.status !== "cancelled").length;
        },
        async listActive(resId) {
            return all
                .filter((o) => o.resId === resId && ["pending", "preparing", "ready"].includes(o.status))
                .sort((a, b) => +a.createdAt - +b.createdAt);
        },
        async pageFinished(resId, skip, limit) {
            const done = all
                .filter((o) => o.resId === resId && ["served", "cancelled"].includes(o.status))
                .sort((a, b) => +b.createdAt - +a.createdAt);
            return { orders: done.slice(skip, skip + limit), total: done.length };
        },
        async setStatus(resId, id, from, to, change, extra = {}) {
            const o = all.find((x) => x._id === id && x.resId === resId && x.status === from);
            if (!o) return null;
            o.status = to;
            o.statusHistory = [...o.statusHistory, { status: to, ...change }];
            Object.assign(o, extra);
            return { ...o };
        },
        async get(resId, id) {
            const o = all.find((x) => x._id === id && x.resId === resId);
            return o ? { ...o } : null;
        },
        async listServed(resIds) {
            return all.filter(inRes(resIds)).filter((o) => o.status === "served");
        },
        async oldestPendingAt() {
            const waiting = all.filter((o) => o.status === "pending").map((o) => o.orderedAt);
            return waiting.length ? new Date(Math.min(...waiting.map(Number))) : null;
        },
    };
}

export function fakeBills(orders: { all: OrderRecord[] }): BillsRepo & { all: (Omit<BillRecord, "orders"> & { orders: string[] })[] } {
    const all: (Omit<BillRecord, "orders"> & { orders: string[] })[] = [];
    let clock = 0;
    const withOrders = (b: (typeof all)[number]): BillRecord => ({
        ...b,
        orders: b.orders.map((id) => orders.all.find((o) => o._id === id)!),
    });
    return {
        all,
        async addToOpenBill(resId, table, orderId) {
            let bill = all.find((b) => b.resId === resId && b.table === table && !b.isPaid);
            if (!bill) {
                bill = { _id: newId(), resId, table, isPaid: false, orders: [], createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)) };
                all.push(bill);
            }
            bill.orders.push(orderId);
        },
        async countFor(resIds, isPaid) {
            return all.filter((b) => resIds.includes(b.resId) && b.isPaid === isPaid).length;
        },
        async listOpen(resId) {
            return all
                .filter((b) => b.resId === resId && !b.isPaid)
                .sort((a, b) => +b.createdAt - +a.createdAt)
                .map(withOrders);
        },
        async pagePaid(resId, skip, limit) {
            const paid = all.filter((b) => b.resId === resId && b.isPaid).sort((a, b) => +b.updatedAt! - +a.updatedAt!);
            return { bills: paid.slice(skip, skip + limit).map(withOrders), total: paid.length };
        },
        async findOpen(resId, table) {
            const b = all.find((x) => x.resId === resId && x.table === table && !x.isPaid);
            return b ? withOrders(b) : null;
        },
        async get(resId, id) {
            const b = all.find((x) => x._id === id && x.resId === resId);
            return b ? withOrders(b) : null;
        },
        async hasOtherOpenBill(resId, table, exceptId) {
            return all.some((b) => b.resId === resId && b.table === table && !b.isPaid && b._id !== exceptId);
        },
        async setPaid(resId, id, isPaid) {
            const b = all.find((x) => x._id === id && x.resId === resId);
            if (!b) return null;
            b.isPaid = isPaid;
            b.updatedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, clock++));
            return withOrders(b);
        },
    };
}

export const R1 = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav", ownerId: "owner1" };
export const R2 = { _id: "665f00000000000000000002", name: "Bai Sach", slug: "bai-sach", ownerId: "owner1" };
export const DISH = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", price: 2.5, image: "k.jpg", isEnabled: true };

/** The menu answers with the real dish and price for each line, and refuses table "closed". */
export function fakeClients(over: Partial<BoundClients> = {}): BoundClients {
    return {
        listOwnerRestaurants: async (ownerId) => (ownerId === "owner1" ? [R1, R2] : []),
        menuCounts: async () => ({ numOfTables: 4, numOfActiveTables: 2, numOfItems: 10 }),
        orderCheck: async (_resId, body) => {
            if (body.table === "closed") throw Object.assign(new Error("Table is not available"), { status: 409 });
            return { items: body.items.map((l) => ({ item: DISH, quantity: l.quantity })) };
        },
        ...over,
    };
}
