import { http, HttpResponse } from "msw";
import { server } from "../msw";
import { describe, expect, it } from "vitest";
import { answer } from "./helpers";

// CL-10: every call goes through a typed function in features/<area>/api.ts. These tests check
// the URL, the method, the body and the parsed result of each one against a mocked API.
const customer = await import("@/features/customer/api");
const kitchen = await import("@/features/kitchen/api");
const cashier = await import("@/features/cashier/api");
const owner = await import("@/features/owner/api");
const staff = await import("@/features/staff/api");
const auth = await import("@/features/auth/api");

const dish = { _id: "i1", name: "Kuy Teav", priceCents: 250, image: "/k.jpg", isEnabled: true };
const table = { _id: "t1", name: "T1", isEnabled: true };
const order = { _id: "o1", table: "T1", status: "pending", createdAt: "2026-11-23T10:00:00Z", orderedItems: [{ item: dish, quantity: 2 }] };

describe("customer api", () => {
    it("loads the public menu", async () => {
        const menu = { categories: [{ _id: null, name: "Other", items: [dish] }] }; // VM-25: by category
        const seen = answer("get", "/api/menu/demo-bistro/public/items", menu);
        expect(await customer.getMenu("demo-bistro")).toEqual(menu);
        expect(seen[0].method).toBe("GET");
    });

    it("checks the table, with the table name encoded", async () => {
        const seen = answer("get", "/api/menu/demo-bistro/public/tables/Patio%201", {});
        await customer.checkTable("demo-bistro", "Patio 1");
        expect(seen).toHaveLength(1);
    });

    it("places an order for the restaurant", async () => {
        const seen = answer("post", "/api/orders/demo-bistro", {}, 201);
        const input = { table: "T1", orderedItems: [{ item: { _id: dish._id }, quantity: 1 }] };
        await customer.placeOrder("demo-bistro", input);
        expect(seen[0].body).toEqual(input);
    });
});

describe("kitchen api", () => {
    it("loads only the orders still to cook (VM-10)", async () => {
        const seen: string[] = [];
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen", ({ request }) => {
                seen.push(new URL(request.url).search);
                return HttpResponse.json([order]);
            }),
        );
        expect(await kitchen.getActiveOrders("demo-bistro")).toEqual([order]);
        expect(seen).toEqual(["?status=active"]);
    });

    it("loads one page of the kitchen history (VM-10)", async () => {
        const page = { orders: [order], page: 2, limit: 20, total: 21, pages: 2 };
        const seen: string[] = [];
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen/history", ({ request }) => {
                seen.push(new URL(request.url).search);
                return HttpResponse.json(page);
            }),
        );
        expect(await kitchen.getKitchenHistory("demo-bistro", 2)).toEqual(page);
        expect(seen).toEqual(["?page=2&limit=20"]);
    });

    it("moves an order to its next status (VM-27)", async () => {
        const seen = answer("patch", "/api/orders/demo-bistro/kitchen/o1/status", { ...order, status: "preparing" });
        expect((await kitchen.setOrderStatus("demo-bistro", "o1", "preparing")).status).toBe("preparing");
        expect(seen[0].body).toEqual({ status: "preparing" });
    });
});

describe("cashier api", () => {
    it("asks for open bills, and one page of paid bills (VM-11)", async () => {
        const seen: string[] = [];
        const page = { bills: [], page: 3, limit: 20, total: 41, pages: 3 };
        server.use(
            http.get("*/api/orders/demo-bistro/bills", ({ request }) => {
                const url = new URL(request.url);
                seen.push(url.search);
                return HttpResponse.json(url.searchParams.get("status") === "paid" ? page : []);
            }),
        );
        await cashier.getOpenBills("demo-bistro");
        expect(await cashier.getPaidBills("demo-bistro", 3)).toEqual(page);
        expect(seen).toEqual(["?status=open", "?status=paid&page=3&limit=20"]);
    });

    it("loads tables, dishes, bills and the overview", async () => {
        const bill = { _id: "b1", table: "T1", isPaid: false, createdAt: "x", orders: [] };
        const overview = { numOfActiveTables: 1, numOfUnpaidOrders: 0, numOfTables: 4, numOfItems: 4, numOfOrders: 2, numOfPayments: 1 };
        answer("get", "/api/menu/demo-bistro/tables", [table]);
        answer("get", "/api/menu/demo-bistro/items", [dish]);
        answer("get", "/api/orders/demo-bistro/bills", [bill]);
        answer("get", "/api/orders/demo-bistro/overview", overview);
        expect(await cashier.getTables("demo-bistro")).toEqual([table]);
        expect(await cashier.getMenuItems("demo-bistro")).toEqual([dish]);
        expect(await cashier.getOpenBills("demo-bistro")).toEqual([bill]); // VM-11
        expect(await cashier.getOverview("demo-bistro")).toEqual(overview);
    });

    it("cancels an order on a bill, with a reason (VM-27)", async () => {
        const seen = answer("patch", "/api/orders/demo-bistro/bills/b1/orders/o1/cancel", { ...order, status: "cancelled" });
        await cashier.cancelOrder("demo-bistro", "b1", "o1", "Wrong dish");
        expect(seen[0].body).toEqual({ reason: "Wrong dish" });
    });

    it("opens and closes tables and dishes, and marks a bill paid", async () => {
        const t = answer("patch", "/api/menu/demo-bistro/tables/t1/availability");
        const i = answer("patch", "/api/menu/demo-bistro/items/i1/availability");
        const b = answer("patch", "/api/orders/demo-bistro/bills/b1");
        await cashier.setTableAvailability("demo-bistro", "t1", false);
        await cashier.setItemAvailability("demo-bistro", "i1", true);
        await cashier.setBillPaid("demo-bistro", "b1", true);
        expect(t[0].body).toEqual({ isEnabled: false });
        expect(i[0].body).toEqual({ isEnabled: true });
        expect(b[0].body).toEqual({ isPaid: true });
    });
});

describe("owner api", () => {
    it("lists and creates restaurants", async () => {
        const r = { _id: "r1", name: "Demo Bistro", slug: "demo-bistro", ownerId: "u", createdAt: "x", updatedAt: "x" };
        answer("get", "/api/restaurants", [r]);
        expect(await owner.getRestaurants()).toEqual([r]);
        const seen = answer("post", "/api/restaurants", [r], 201);
        expect(await owner.createRestaurant("Demo Bistro")).toEqual([r]);
        expect(seen[0].body).toEqual({ name: "Demo Bistro" });
    });

    it("loads the owner-wide overview and the per-restaurant summaries", async () => {
        answer("get", "/api/orders/owner/overview", { numOfOrders: 3 });
        answer("get", "/api/orders/owner/restaurants", [{ resId: "r1", resName: "Demo Bistro" }]);
        expect(await owner.getOwnerOverview()).toEqual({ numOfOrders: 3 });
        expect(await owner.getRestaurantSummaries()).toEqual([{ resId: "r1", resName: "Demo Bistro" }]);
    });

    it("adds, edits and removes dishes", async () => {
        const add = answer("post", "/api/menu/demo-bistro/items", dish, 201);
        const edit = answer("put", "/api/menu/demo-bistro/items/i1", dish);
        const del = answer("delete", "/api/menu/demo-bistro/items/i1");
        const { _id: _ignored, ...input } = dish;
        await owner.createMenuItem("demo-bistro", input);
        await owner.updateMenuItem("demo-bistro", dish);
        await owner.deleteMenuItem("demo-bistro", "i1");
        expect(add[0].body).toEqual(input);
        expect(edit[0].body).toEqual(dish);
        expect(del).toHaveLength(1);
    });

    it("adds, edits and removes tables", async () => {
        const add = answer("post", "/api/menu/demo-bistro/tables", table, 201);
        const edit = answer("put", "/api/menu/demo-bistro/tables/t1", table);
        const del = answer("delete", "/api/menu/demo-bistro/tables/t1");
        await owner.createTable("demo-bistro", { name: "T1", type: "manual" });
        await owner.updateTable("demo-bistro", "t1", table);
        await owner.deleteTable("demo-bistro", "t1");
        expect(add[0].body).toEqual({ name: "T1", type: "manual" });
        expect(edit[0].body).toEqual(table);
        expect(del).toHaveLength(1);
    });
});

describe("staff api", () => {
    const member = {
        _id: "s1",
        name: "Dara",
        tenantId: "u2",
        email: "dara@x.com",
        role: "cashier",
        resId: "r1",
        createdAt: "x",
        updatedAt: "x",
    };

    it("lists staff for one restaurant and for all of them", async () => {
        answer("get", "/api/restaurants/demo-bistro/staff", [member]);
        answer("get", "/api/staff", [{ resName: "Demo Bistro", staff: [member] }]);
        expect(await staff.getStaff("demo-bistro")).toEqual([member]);
        expect(await staff.getAllStaff()).toEqual([{ resName: "Demo Bistro", staff: [member] }]);
    });

    it("adds, edits and removes a staff member", async () => {
        const add = answer("post", "/api/restaurants/demo-bistro/staff", member, 201);
        const edit = answer("put", "/api/restaurants/demo-bistro/staff/s1", member);
        const del = answer("delete", "/api/restaurants/demo-bistro/staff/s1");
        await staff.addStaff("demo-bistro", { name: "Dara", email: "dara@x.com", role: "cashier", tenantId: "u2" });
        await staff.updateStaff("demo-bistro", member as never);
        await staff.removeStaff("demo-bistro", "s1");
        expect(add[0].body).toEqual({ name: "Dara", email: "dara@x.com", role: "cashier", tenantId: "u2" });
        expect(edit[0].body).toEqual(member);
        expect(del).toHaveLength(1);
    });
});

describe("auth api", () => {
    it("exchanges a Firebase token for a session cookie, and hands nothing back (SEC-01)", async () => {
        const seen = answer("post", "/api/auth/login", { role: "chef" });
        expect(await auth.login({ idToken: "fb", role: "chef", resSlug: "demo-bistro" })).toBeUndefined();
        expect(seen[0].body).toEqual({ idToken: "fb", role: "chef", resSlug: "demo-bistro" });
    });

    it("loads memberships and signs up an owner", async () => {
        answer("post", "/api/auth/memberships", { owner: ["Demo Bistro - demo-bistro"] });
        expect(await auth.getMemberships("fb")).toEqual({ owner: ["Demo Bistro - demo-bistro"] });
        const seen = answer("post", "/api/auth/signup", {}, 201);
        await auth.signup({ idToken: "fb", ownerName: "Sok", resName: "Demo Bistro" });
        expect(seen[0].body).toEqual({ idToken: "fb", ownerName: "Sok", resName: "Demo Bistro" });
    });
});

describe("errors", () => {
    it("rejects with the server's message, which apiErrorMessage turns into text", async () => {
        const { apiErrorMessage } = await import("@/lib/api");
        answer("post", "/api/orders/demo-bistro", { message: "Table T9 is closed" }, 409);
        const err = await customer.placeOrder("demo-bistro", { table: "T9", orderedItems: [] }).catch((e) => e);
        expect(apiErrorMessage(err)).toBe("Table T9 is closed");
    });

    it("falls back to a general message when the server sends none", async () => {
        const { apiErrorMessage } = await import("@/lib/api");
        answer("get", "/api/orders/demo-bistro/kitchen", {}, 500);
        const err = await kitchen.getActiveOrders("demo-bistro").catch((e: unknown) => e);
        expect(apiErrorMessage(err, "Could not load the orders")).toBe("Could not load the orders");
    });

    it("tells a 404 apart, for the table check", async () => {
        const { apiStatus } = await import("@/lib/api");
        answer("get", "/api/menu/demo-bistro/public/tables/T9", { message: "Not found" }, 404);
        const err = await customer.checkTable("demo-bistro", "T9").catch((e) => e);
        expect(apiStatus(err)).toBe(404);
    });
});
