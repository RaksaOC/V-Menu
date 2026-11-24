import { Router, type Request } from "express";
import mongoose from "mongoose";
import { assertRestaurantAccess, requireRole, type Role } from "./lib/auth.js";
import { assertId, badRequest, HttpError, notFound } from "./lib/errors.js";
import { requireInternal } from "./lib/internal.js";
import { lookupRestaurant as defaultLookup, type LookupRestaurant } from "./lib/restaurants.js";
import { baseApp, finish } from "./lib/server.js";
import { Item, Table } from "./models.js";

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

// Only these fields can be set from a request body (no resId or _id smuggling).
function itemFields(body: Record<string, unknown>, partial: boolean) {
    const out: Record<string, unknown> = {};
    const name = str(body.name, 120);
    const image = str(body.image, 2000);
    const price = Number(body.price);
    if (name) out.name = name;
    if (image) out.image = image;
    if (body.price !== undefined && Number.isFinite(price) && price >= 0) out.price = price;
    if (typeof body.isEnabled === "boolean") out.isEnabled = body.isEnabled;
    if (!partial && (!out.name || !out.image || out.price === undefined)) throw badRequest("Name, price and image are required");
    return out;
}

function flag(body: Record<string, unknown>) {
    if (typeof body?.isEnabled !== "boolean") throw badRequest("isEnabled must be true or false");
    return body.isEnabled;
}

export function createApp({ lookupRestaurant = defaultLookup }: { lookupRestaurant?: LookupRestaurant } = {}) {
    const app = baseApp();

    // Resolves :slug and checks the caller may act on that restaurant.
    async function restaurantFor(req: Request) {
        const restaurant = await lookupRestaurant(req, String(req.params.slug));
        if (req.user) assertRestaurantAccess(req.user, restaurant);
        return restaurant;
    }

    async function ownItem(req: Request) {
        const restaurant = await restaurantFor(req);
        assertId(String(req.params.id), "item id");
        const item = await Item.findOne({ _id: req.params.id, resId: restaurant._id });
        if (!item) throw notFound("Menu item not found");
        return item;
    }

    async function ownTable(req: Request) {
        const restaurant = await restaurantFor(req);
        assertId(String(req.params.id), "table id");
        const table = await Table.findOne({ _id: req.params.id, resId: restaurant._id });
        if (!table) throw notFound("Table not found");
        return table;
    }

    const menu = Router({ mergeParams: true });
    const staff: Role[] = ["owner", "cashier"];

    // ---------------- public: what a customer at a table sees ----------------
    menu.get("/public/items", async (req, res) => {
        const restaurant = await restaurantFor(req);
        res.json(await Item.find({ resId: restaurant._id, isEnabled: true }).lean());
    });

    menu.get("/public/tables/:name", async (req, res) => {
        const restaurant = await restaurantFor(req);
        const open = await Table.exists({ name: String(req.params.name), resId: restaurant._id, isEnabled: true });
        if (!open) throw new HttpError(404, "Table is not available");
        res.json({ message: "Table is available" });
    });

    // ---------------- menu items ----------------
    menu.get("/items", requireRole(...staff), async (req, res) => {
        const restaurant = await restaurantFor(req);
        res.json(await Item.find({ resId: restaurant._id }).lean());
    });

    menu.post("/items", requireRole("owner"), async (req, res) => {
        const restaurant = await restaurantFor(req);
        res.status(201).json(await Item.create({ ...itemFields(req.body ?? {}, false), resId: restaurant._id }));
    });

    menu.put("/items/:id", requireRole("owner"), async (req, res) => {
        const item = await ownItem(req);
        item.set(itemFields(req.body ?? {}, true));
        res.json(await item.save());
    });

    menu.delete("/items/:id", requireRole("owner"), async (req, res) => {
        const item = await ownItem(req);
        await item.deleteOne();
        res.json(item);
    });

    // Cashier or owner switches a dish on or off.
    menu.patch("/items/:id/availability", requireRole(...staff), async (req, res) => {
        const item = await ownItem(req);
        item.isEnabled = flag(req.body);
        res.json(await item.save());
    });

    // ---------------- tables ----------------
    menu.get("/tables", requireRole(...staff), async (req, res) => {
        const restaurant = await restaurantFor(req);
        res.json(await Table.find({ resId: restaurant._id }).lean());
    });

    // "manual" uses the given name; anything else takes the next free number, as before.
    menu.post("/tables", requireRole("owner"), async (req, res) => {
        const restaurant = await restaurantFor(req);
        let name: string;
        if (req.body?.type === "manual") {
            const given = str(req.body.name, 40);
            if (!given) throw badRequest("Table name is required");
            if (await Table.exists({ name: given, resId: restaurant._id })) throw badRequest("Name is taken");
            name = given;
        } else {
            const numbers = (await Table.find({ resId: restaurant._id }, { name: 1 }).lean()).map((t) => parseInt(t.name)).filter((n) => !isNaN(n));
            name = String(numbers.length ? Math.max(...numbers) + 1 : 1);
        }
        res.status(201).json(await Table.create({ name, isEnabled: false, resId: restaurant._id }));
    });

    menu.put("/tables/:id", requireRole("owner"), async (req, res) => {
        const table = await ownTable(req);
        const name = str(req.body?.name, 40);
        if (name && name !== table.name) {
            if (await Table.exists({ name, resId: table.resId })) throw badRequest("Name is taken");
            table.name = name;
        }
        if (typeof req.body?.isEnabled === "boolean") table.isEnabled = req.body.isEnabled;
        res.json(await table.save());
    });

    menu.delete("/tables/:id", requireRole("owner"), async (req, res) => {
        const table = await ownTable(req);
        await table.deleteOne();
        res.json(table);
    });

    // Cashier or owner opens or closes a table.
    menu.patch("/tables/:id/availability", requireRole(...staff), async (req, res) => {
        const table = await ownTable(req);
        table.isEnabled = flag(req.body);
        res.json(await table.save());
    });

    app.use("/api/menu/:slug", menu);

    // ---------------- internal: used by order-service ----------------
    const internal = Router();
    internal.use(requireInternal);

    internal.get("/restaurants/:resId/counts", async (req, res) => {
        const resId = String(req.params.resId);
        const [numOfTables, numOfActiveTables, numOfItems] = await Promise.all([
            Table.countDocuments({ resId }),
            Table.countDocuments({ resId, isEnabled: true }),
            Item.countDocuments({ resId }),
        ]);
        res.json({ numOfTables, numOfActiveTables, numOfItems });
    });

    // Checks a customer's cart before order-service saves it: the table must be open and every
    // dish still on the menu. Prices come from here, not from the browser.
    internal.post("/restaurants/:resId/order-check", async (req, res) => {
        const resId = String(req.params.resId);
        const table = str(req.body?.table, 40);
        const lines: { _id: string; quantity: number }[] = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!table || lines.length === 0 || lines.length > 100) throw badRequest("A table and at least one item are required");
        for (const l of lines) {
            assertId(String(l?._id), "item id");
            if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99) throw badRequest("Quantity must be 1 to 99");
        }
        if (!(await Table.exists({ name: table, resId, isEnabled: true }))) throw new HttpError(409, "Table is not available");
        const ids = [...new Set(lines.map((l) => String(l._id)))];
        const items = await Item.find({ _id: mongoose.trusted({ $in: ids }), resId, isEnabled: true }).lean();
        if (items.length !== ids.length) throw new HttpError(409, "Some items are no longer available");
        const byId = new Map(items.map((i) => [String(i._id), i]));
        res.json({
            items: lines.map((l) => {
                const i = byId.get(String(l._id))!;
                return { item: { _id: String(i._id), name: i.name, price: i.price, image: i.image, isEnabled: i.isEnabled }, quantity: l.quantity };
            }),
        });
    });
    app.use("/internal", internal);

    return finish(app);
}
