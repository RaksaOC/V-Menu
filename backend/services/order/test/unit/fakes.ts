// In-memory repositories and clients for the service unit tests (CL-04): no MongoDB, no HTTP.
import type { BillRecord, BillsRepo } from "../../src/repositories/bills.repo.js";
import type { OrderRecord, OrdersRepo } from "../../src/repositories/orders.repo.js";
import type { BoundClients } from "../../src/clients/index.js";

let seq = 0;
/** VM-09: is the date inside the range (from inclusive, to exclusive)? */
const within = (range: { from?: Date; to?: Date }, at: Date) => (!range.from || at >= range.from) && (!range.to || at < range.to);
export const newId = () => (++seq).toString(16).padStart(24, "0");

export function fakeOrders(): OrdersRepo & { all: OrderRecord[]; onBill: (id: string) => boolean; failCreates: number } {
    const all: OrderRecord[] = [];
    let clock = 0;
    const inRes = (resIds: string[]) => (o: OrderRecord) => resIds.includes(o.resId);
    const repo: OrdersRepo & { all: OrderRecord[]; onBill: (id: string) => boolean; failCreates: number } = {
        all,
        onBill: () => false, // fakeBills fills this in
        failCreates: 0, // VM-23: the next N saves throw, like a database hiccup
        async create({ table, orderedItems, resId, billId }) {
            if (repo.failCreates > 0) {
                repo.failCreates--;
                throw new Error("database hiccup");
            }
            const at = new Date(Date.UTC(2026, 0, 1, 0, 0, clock++));
            const order = {
                _id: newId(),
                table,
                orderedItems,
                resId,
                ...(billId && { billId }),
                status: "pending" as const,
                statusHistory: [{ status: "pending" as const, at, by: "customer" }],
                orderedAt: at,
                createdAt: at,
            };
            all.push(order);
            return order;
        },
        async countFor(resIds, range = {}) {
            return all.filter(inRes(resIds)).filter((o) => o.status !== "cancelled" && within(range, o.createdAt)).length;
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
        async setBill(resId, id, billId) {
            const o = all.find((x) => x._id === id && x.resId === resId);
            if (o) o.billId = billId;
        },
        async remove(resId, id) {
            const i = all.findIndex((x) => x._id === id && x.resId === resId);
            if (i >= 0) all.splice(i, 1);
        },
        async listWithoutBill({ from, to }, limit) {
            const found = all
                .filter((o) => o.status !== "cancelled" && o.createdAt >= from && o.createdAt < to && !repo.onBill(o._id))
                .sort((a, b) => +a.createdAt - +b.createdAt);
            return {
                total: found.length,
                orders: found.slice(0, limit).map((o) => ({
                    _id: o._id,
                    resId: o.resId,
                    table: o.table,
                    createdAt: o.createdAt,
                    ...(o.billId && { billId: o.billId }),
                })),
            };
        },
    };
    return repo;
}

type FakeBill = Omit<BillRecord, "orders"> & { orders: string[] };

export function fakeBills(orders: { all: OrderRecord[]; onBill?: (id: string) => boolean }): BillsRepo & {
    all: FakeBill[];
    failUpdates: number;
} {
    const all: FakeBill[] = [];
    let clock = 0;
    orders.onBill = (id) => all.some((b) => b.orders.includes(id));
    /** VM-23: the next N bill updates throw, like a database hiccup. */
    const hiccup = () => {
        if (repo.failUpdates > 0) {
            repo.failUpdates--;
            throw new Error("database hiccup");
        }
    };
    const withOrders = (b: (typeof all)[number]): BillRecord => ({
        ...b,
        orders: b.orders.map((id) => orders.all.find((o) => o._id === id)!),
    });
    const repo: BillsRepo & { all: FakeBill[]; failUpdates: number } = {
        all,
        failUpdates: 0,
        async openBillFor(resId, table) {
            let bill = all.find((b) => b.resId === resId && b.table === table && !b.isPaid);
            if (!bill) {
                bill = { _id: newId(), resId, table, isPaid: false, orders: [], createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)) };
                all.push(bill);
            }
            return bill._id;
        },
        async attachOrder(billId, orderId) {
            hiccup();
            const bill = all.find((b) => b._id === billId && !b.isPaid);
            if (!bill) return false;
            if (!bill.orders.includes(orderId)) bill.orders.push(orderId);
            return true;
        },
        async detachOrder(resId, orderId) {
            for (const b of all) if (b.resId === resId) b.orders = b.orders.filter((id) => id !== orderId);
        },
        async removeEmptyOpen(resId, table) {
            const i = all.findIndex((b) => b.resId === resId && b.table === table && !b.isPaid && b.orders.length === 0);
            if (i >= 0) all.splice(i, 1);
        },
        async countOpen(resIds) {
            return all.filter((b) => resIds.includes(b.resId) && !b.isPaid && b.orders.length > 0).length;
        },
        async listPaid(resIds, range = {}) {
            return all.filter((b) => resIds.includes(b.resId) && b.isPaid && within(range, b.updatedAt!)).map(withOrders);
        },
        async listOpen(resId) {
            return all
                .filter((b) => b.resId === resId && !b.isPaid && b.orders.length > 0)
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
    return repo;
}

export const R1 = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav", ownerId: "owner1" };
export const R2 = { _id: "665f00000000000000000002", name: "Bai Sach", slug: "bai-sach", ownerId: "owner1" };
export const DISH = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", priceCents: 250, image: "k.jpg", isEnabled: true };

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
