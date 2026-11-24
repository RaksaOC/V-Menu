// CL-04: the business rules, with in-memory repositories (no MongoDB, no HTTP).
import { describe, expect, it } from "vitest";
import { DISH, R1, R2, newId } from "./fakes.js";
import { aBill, anOrder, seed } from "./builders.js";
import { line, serve, setup, status } from "./services-setup.js";

describe("dashboard numbers", () => {
    async function busyDay() {
        const s = setup();
        const done = async (resId: string, table: string, quantity: number) => {
            const o = await s.placing.place(resId, { table, orderedItems: [line(quantity)] });
            await serve(s.kitchen, resId, o._id);
            return o;
        };
        await done(R1._id, "1", 2);
        await done(R2._id, "5", 3);
        await s.placing.place(R1._id, { table: "2", orderedItems: [line(4)] }); // on an open bill: not earned
        await s.billing.setPaid(R1._id, s.bills.all[0]!._id, true);
        return s;
    }

    it("one restaurant: its counts, and the revenue from its paid bills (VM-09)", async () => {
        const { stats } = await busyDay();
        expect(await stats.restaurantOverview(R1._id)).toEqual({
            tableCount: 4,
            activeTableCount: 2,
            itemCount: 10,
            orderCount: 2,
            unpaidBillCount: 1,
            paymentCount: 1,
            revenueCents: 500, // table 1's paid bill: 2 x 2.50
            from: null,
            to: null,
        });
    });

    it("the owner's list of restaurants, each with its numbers", async () => {
        const { stats } = await busyDay();
        const list = await stats.ownerRestaurants("owner1");
        expect(list.map((r) => [r.resName, r.orderCount, r.revenueCents])).toEqual([
            ["Mee Keav", 2, 500],
            ["Bai Sach", 1, 0],
        ]);
        expect(await stats.ownerRestaurants("someone-else")).toEqual([]);
    });

    it("the owner's totals with no orders, and lines without a price", async () => {
        const empty = setup();
        expect(await empty.stats.ownerOverview("owner1")).toMatchObject({
            orderCount: 0,
            avgItemsPerOrder: 0,
            revenueCents: 0,
            itemsSoldCount: 0,
            topSellingItems: [],
        });

        const free = setup({
            orderCheck: async (_r: string, body: { items: { quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: { ...DISH, priceCents: 0 }, quantity: l.quantity })),
            }),
        });
        await free.placing.place(R1._id, { table: "1", orderedItems: [line(1)] });
        await free.billing.setPaid(R1._id, free.bills.all[0]!._id, true);
        expect(await free.stats.ownerOverview("owner1")).toMatchObject({ revenueCents: 0, itemsSoldCount: 1, avgItemsPerOrder: 1 });
    });

    it("ranks the top five sellers", async () => {
        const dishes = ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ ...DISH, _id: newId(), name, priceCents: 100 + i }));
        const s = setup({
            orderCheck: async (_r: string, body: { items: { _id: string; quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: dishes.find((d) => d._id === l._id)!, quantity: l.quantity })),
            }),
        });
        await s.placing.place(R1._id, {
            table: "1",
            orderedItems: dishes.map((d, i) => ({ item: { _id: d._id }, quantity: i + 1 })),
        });
        await s.billing.setPaid(R1._id, s.bills.all[0]!._id, true);
        const top = (await s.stats.ownerOverview("owner1")).topSellingItems;
        expect(top.map((t) => t.name)).toEqual(["F", "E", "D", "C", "B"]);
    });
});

// VM-09: fixed fixtures. Two paid bills, one unpaid, a dish renamed between orders, and two
// different dishes that once shared a name. Revenue comes from paid bills only.
describe("owner revenue and top sellers (VM-09)", () => {
    const at = (day: number) => new Date(Date.UTC(2026, 10, day, 12));
    const KUY = "665f00000000000000000a01"; // renamed from "Kuy Teav" to "Kuy Teav (large)"
    const COFFEE = "665f00000000000000000a02";
    const OTHER_KUY = "665f00000000000000000a03"; // a different dish, also called "Kuy Teav"
    const dish = (_id: string, name: string, price: number) => ({
        _id,
        name,
        priceCents: Math.round(price * 100),
        image: "x.jpg",
        isEnabled: true,
    });

    function fixtures() {
        const s = setup();
        const kuy = dish(KUY, "Kuy Teav", 2.5);
        const kuyLarge = dish(KUY, "Kuy Teav (large)", 3);
        const coffee = dish(COFFEE, "Iced Coffee", 1.25);
        seed(
            s,
            // Mee Keav, table 1, paid on 1 Nov: 2 x 2.50 + 1 x 1.25, and a cancelled order of 4 coffees
            aBill()
                .id("b1")
                .paid()
                .on(at(1))
                .with(
                    anOrder().id("o1").at(R1._id, "1").status("served").on(at(1)).withLines([kuy, 2], [coffee, 1]).build(),
                    anOrder().id("o2").at(R1._id, "1").status("cancelled").on(at(1)).withLines([coffee, 4]).build(),
                )
                .build(),
            // Bai Sach, table 5, paid on 10 Nov. The kitchen never marked it served; it was paid, so it counts.
            aBill()
                .id("b2")
                .paid()
                .on(at(10))
                .with(
                    anOrder()
                        .id("o3")
                        .at(R2._id, "5")
                        .status("ready")
                        .on(at(10))
                        .withLines([kuyLarge, 1], [dish(OTHER_KUY, "Kuy Teav", 4), 4])
                        .build(),
                )
                .build(),
            // Mee Keav, table 2, still open: served, but not paid, so not revenue
            aBill()
                .id("b3")
                .on(at(12))
                .with(anOrder().id("o4").at(R1._id, "2").status("served").on(at(12)).withLines([kuyLarge, 10]).build())
                .build(),
        );
        return s;
    }

    it("revenue is the lines on paid bills; cancelled orders and open bills count nowhere", async () => {
        const o = await fixtures().stats.ownerOverview("owner1");
        expect(o.revenueCents).toBe(2525); // $5 + $1.25 + $3 + $16
        expect(o.itemsSoldCount).toBe(8); // 2 + 1 + 1 + 4
        expect(o.avgItemsPerOrder).toBe(4); // 8 items on the 2 paid, not cancelled orders
        expect(o.orderCount).toBe(3); // o1, o3, o4; the cancelled o2 isn't an order that counts
        expect(o.paymentCount).toBe(2);
        expect(o.unpaidBillCount).toBe(1);
        expect(o.itemCount).toBe(20);
    });

    it("top sellers are grouped by dish id, with the dish's most recent name", async () => {
        const o = await fixtures().stats.ownerOverview("owner1");
        expect(o.topSellingItems).toEqual([
            { _id: OTHER_KUY, name: "Kuy Teav", quantity: 4 },
            { _id: KUY, name: "Kuy Teav (large)", quantity: 3 },
            { _id: COFFEE, name: "Iced Coffee", quantity: 1 },
        ]);
    });

    it("each restaurant's overview has its own revenue", async () => {
        const { stats } = fixtures();
        expect((await stats.restaurantOverview(R1._id)).revenueCents).toBe(625);
        expect((await stats.restaurantOverview(R2._id)).revenueCents).toBe(1900);
    });

    it("a date range keeps the bills paid in it, and the orders placed in it", async () => {
        const { stats } = fixtures();
        const range = { from: "2026-11-05T00:00:00.000Z", to: "2026-11-30T00:00:00.000Z" };
        const o = await stats.ownerOverview("owner1", range);
        expect(o).toMatchObject({ revenueCents: 1900, itemsSoldCount: 5, orderCount: 2, paymentCount: 1, ...range });
        expect(await stats.restaurantOverview(R1._id, range)).toMatchObject({ revenueCents: 0, orderCount: 1, paymentCount: 0, ...range });
        // open bills are what's open now, whatever the range
        expect(o.unpaidBillCount).toBe(1);
    });

    it("refuses a date that isn't one, and a range that ends before it starts", async () => {
        const { stats } = fixtures();
        expect(await status(stats.ownerOverview("owner1", { from: "yesterday" }))).toBe(400);
        expect(await status(stats.ownerOverview("owner1", { from: "2026-11-10", to: "2026-11-01" }))).toBe(400);
    });
});
