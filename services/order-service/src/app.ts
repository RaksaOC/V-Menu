import { Router, type Request } from "express";
import mongoose from "mongoose";
import { assertRestaurantAccess, requireRole } from "./lib/auth.js";
import { httpClients, type Clients } from "./lib/clients.js";
import { assertId, badRequest, notFound } from "./lib/errors.js";
import { lookupRestaurant as defaultLookup, type LookupRestaurant, type RestaurantRef } from "./lib/restaurants.js";
import { baseApp, finish } from "./lib/server.js";
import { Order, TableOrder } from "./models.js";

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

export function createApp({ lookupRestaurant = defaultLookup, clients = httpClients }: { lookupRestaurant?: LookupRestaurant; clients?: Clients } = {}) {
    const app = baseApp();

    async function restaurantFor(req: Request) {
        const restaurant = await lookupRestaurant(req, String(req.params.slug));
        if (req.user) assertRestaurantAccess(req.user, restaurant);
        return restaurant;
    }

    // The same six numbers the cashier and owner dashboards show for one restaurant.
    async function overview(req: Request, r: RestaurantRef) {
        const [counts, numOfOrders, numOfUnpaidOrders, numOfPayments] = await Promise.all([
            clients.menuCounts(req, r._id),
            Order.countDocuments({ resId: r._id }),
            TableOrder.countDocuments({ resId: r._id, isPayed: false }),
            TableOrder.countDocuments({ resId: r._id, isPayed: true }),
        ]);
        return { ...counts, numOfOrders, numOfUnpaidOrders, numOfPayments };
    }

    // ---------------- owner: across all their restaurants ----------------
    // Mounted before "/:slug" so "owner" is never read as a restaurant slug.
    const owner = Router();
    owner.use(requireRole("owner"));

    owner.get("/restaurants", async (req, res) => {
        const list = await clients.listOwnerRestaurants(req, req.user!.uid);
        res.json(await Promise.all(list.map(async (r) => ({ resId: r._id, resName: r.name, ...(await overview(req, r)) }))));
    });

    owner.get("/overview", async (req, res) => {
        const list = await clients.listOwnerRestaurants(req, req.user!.uid);
        const resIds = list.map((r) => r._id);
        const filter = { resId: mongoose.trusted({ $in: resIds }) };
        const [numOfUnpaidOrders, numOfPayments, numOfOrders, done, counts] = await Promise.all([
            TableOrder.countDocuments({ ...filter, isPayed: false }),
            TableOrder.countDocuments({ ...filter, isPayed: true }),
            Order.countDocuments(filter),
            Order.find({ ...filter, isDone: true }).lean(),
            Promise.all(list.map((r) => clients.menuCounts(req, r._id))),
        ]);
        let numOfMoneyEarned = 0;
        let totalItemsSold = 0;
        const sold = new Map<string, number>();
        for (const order of done) {
            for (const line of order.orderedItems) {
                if (!line.item?.price) continue;
                numOfMoneyEarned += line.item.price * line.quantity;
                totalItemsSold += line.quantity;
                sold.set(line.item.name!, (sold.get(line.item.name!) ?? 0) + line.quantity);
            }
        }
        res.json({
            numOfUnpaidOrders,
            numOfItems: counts.reduce((n, c) => n + c.numOfItems, 0),
            numOfOrders,
            numOfPayments,
            numOfMoneyEarned,
            totalItemsSold,
            avgItemsPerOrder: numOfOrders > 0 ? Number((totalItemsSold / numOfOrders).toFixed(2)) : 0,
            topSellingItems: [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })),
        });
    });
    app.use("/api/orders/owner", owner);

    // ---------------- one restaurant ----------------
    const orders = Router({ mergeParams: true });

    // Customer places an order. menu-service confirms the table is open and supplies the
    // real prices; the order is then added to that table's open bill.
    orders.post("/", async (req, res) => {
        const restaurant = await restaurantFor(req);
        const table = str(String(req.body?.table ?? ""), 40);
        const lines = Array.isArray(req.body?.orderedItems) ? req.body.orderedItems : [];
        if (!table || lines.length === 0) throw badRequest("A table and at least one item are required");
        const { items } = await clients.orderCheck(req, restaurant._id, {
            table,
            items: lines.map((l: { item?: { _id?: string }; quantity?: number }) => ({ _id: String(l?.item?._id ?? ""), quantity: Number(l?.quantity) })),
        });
        const order = await Order.create({ table, orderedItems: items, resId: restaurant._id });
        await TableOrder.findOneAndUpdate(
            { table, resId: restaurant._id, isPayed: false },
            { $push: { orders: order._id }, $setOnInsert: { table, resId: restaurant._id, isPayed: false } },
            { upsert: true },
        );
        req.log.info({ orderId: String(order._id), restaurant: restaurant.slug, table, lines: items.length }, "order placed");
        res.status(201).json(order);
    });

    // Kitchen queue
    orders.get("/kitchen", requireRole("chef"), async (req, res) => {
        const restaurant = await restaurantFor(req);
        res.json(await Order.find({ resId: restaurant._id }).sort({ createdAt: 1 }).lean());
    });

    orders.patch("/kitchen/:id/done", requireRole("chef"), async (req, res) => {
        const restaurant = await restaurantFor(req);
        assertId(String(req.params.id), "order id");
        const order = await Order.findOneAndUpdate({ _id: req.params.id, resId: restaurant._id }, { isDone: true }, { new: true });
        if (!order) throw notFound("Order not found");
        res.json(order);
    });

    // Cashier: bills per table
    orders.get("/bills", requireRole("cashier"), async (req, res) => {
        const restaurant = await restaurantFor(req);
        res.json(await TableOrder.find({ resId: restaurant._id }).sort({ createdAt: -1 }).populate("orders").lean());
    });

    orders.patch("/bills/:id", requireRole("cashier"), async (req, res) => {
        const restaurant = await restaurantFor(req);
        assertId(String(req.params.id), "bill id");
        if (typeof req.body?.isPayed !== "boolean") throw badRequest("isPayed must be true or false");
        const bill = await TableOrder.findOneAndUpdate({ _id: req.params.id, resId: restaurant._id }, { isPayed: req.body.isPayed }, { new: true }).populate("orders");
        if (!bill) throw notFound("Bill not found");
        res.json(bill);
    });

    orders.get("/overview", requireRole("owner", "cashier"), async (req, res) => {
        res.json(await overview(req, await restaurantFor(req)));
    });

    app.use("/api/orders/:slug", orders);
    return finish(app);
}
