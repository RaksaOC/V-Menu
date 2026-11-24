// CL-04: the business rules, with in-memory repositories (no MongoDB, no HTTP).
import { describe, expect, it } from "vitest";
import { sales } from "../../src/services/stats.service.js";
import { aBill, anOrder } from "./builders.js";
import { R1 } from "./fakes.js";

describe("sales from paid bills (VM-09)", () => {
    const order = (orderedItems: unknown[]) => ({ _id: "o", status: "served", createdAt: new Date(), orderedItems }) as never;
    const bill = (orders: unknown[]) => ({ _id: "b", table: "1", resId: R1._id, isPaid: true, createdAt: new Date(), orders }) as never;

    it("skips an order that no longer exists and a line without a dish; a missing price is 0", () => {
        const s = sales([bill([null, order([{ quantity: 2 }, { item: { _id: "x", name: "Water" }, quantity: 1 }])])]);
        expect(s).toEqual({
            revenueCents: 0,
            itemsSoldCount: 1,
            avgItemsPerOrder: 1,
            topSellingItems: [{ _id: "x", name: "Water", quantity: 1 }],
        });
    });

    it("equal sellers are listed by name", () => {
        const dish = (_id: string, name: string) => ({ _id, name, priceCents: 100, image: "x.jpg", isEnabled: true });
        const paid = aBill()
            .paid()
            .with(
                anOrder()
                    .withLines([dish("b", "Tea"), 1], [dish("a", "Amok"), 1])
                    .build(),
            )
            .build();
        const s = sales([{ ...paid.bill, orders: paid.orders }]);
        expect(s.topSellingItems.map((t) => t.name)).toEqual(["Amok", "Tea"]);
    });
});
