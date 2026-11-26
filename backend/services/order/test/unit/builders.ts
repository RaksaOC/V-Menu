// CL-14: test data builders, so a test says only what matters to it:
//   anOrder().at(R2._id, "5").withLines([KUY, 2]).status("served").build()
//   aBill().paid().on(day(1)).with(order1, order2).build()
// Anything not set gets a plain default: restaurant R1, table 1, one Kuy Teav, pending, today.
import type { OrderStatus } from "@vmenu/contracts";
import type { OrderRecord } from "../../src/repositories/orders.repo.js";
import { DISH, R1, newId } from "./fakes.js";

type Dish = { _id: string; name: string; priceCents: number; image: string; isEnabled: boolean };

export function anOrder() {
    const order: OrderRecord = {
        _id: newId(),
        resId: R1._id,
        table: "1",
        status: "pending",
        statusHistory: [],
        orderedItems: [{ item: DISH, quantity: 1 }],
        orderedAt: new Date(),
        createdAt: new Date(),
    };
    const builder = {
        id(_id: string) {
            order._id = _id;
            return builder;
        },
        at(resId: string, table = "1") {
            order.resId = resId;
            order.table = table;
            return builder;
        },
        /** `withLines(3)`: three lines of the default dish; or the lines themselves, as [dish, quantity]. */
        withLines(...lines: [number] | [Dish, number][]) {
            order.orderedItems =
                typeof lines[0] === "number"
                    ? Array.from({ length: lines[0] }, () => ({ item: DISH, quantity: 1 }))
                    : (lines as [Dish, number][]).map(([item, quantity]) => ({ item, quantity }));
            return builder;
        },
        status(status: OrderStatus) {
            order.status = status;
            return builder;
        },
        on(date: Date) {
            order.orderedAt = date;
            order.createdAt = date;
            return builder;
        },
        build(): OrderRecord {
            return { ...order, orderedItems: [...order.orderedItems] };
        },
    };
    return builder;
}

/** A bill as the fake bills repository stores it: the orders by id. */
export interface BillRow {
    _id: string;
    resId: string;
    table: string;
    isPaid: boolean;
    orders: string[];
    createdAt: Date;
    updatedAt: Date;
}

export function aBill() {
    let orders: OrderRecord[] = [];
    const bill = { _id: newId(), resId: R1._id, table: "1", isPaid: false, createdAt: new Date(), updatedAt: new Date() };
    const builder = {
        id(_id: string) {
            bill._id = _id;
            return builder;
        },
        paid() {
            bill.isPaid = true;
            return builder;
        },
        on(date: Date) {
            bill.createdAt = date;
            bill.updatedAt = date;
            return builder;
        },
        /** The bill takes its restaurant and table from its first order. */
        with(...list: OrderRecord[]) {
            orders = list;
            if (list[0]) Object.assign(bill, { resId: list[0].resId, table: list[0].table });
            return builder;
        },
        build(): { bill: BillRow; orders: OrderRecord[] } {
            return { bill: { ...bill, orders: orders.map((o) => o._id) }, orders };
        },
    };
    return builder;
}

/** Puts built bills, and their orders, into the fake repositories. */
export function seed(
    repos: { orders: { all: OrderRecord[] }; bills: { all: unknown[] } },
    ...bills: ReturnType<ReturnType<typeof aBill>["build"]>[]
) {
    for (const { bill, orders } of bills) {
        repos.orders.all.push(...orders);
        repos.bills.all.push(bill);
    }
}
