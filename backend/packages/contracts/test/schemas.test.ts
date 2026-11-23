import { describe, expect, it } from "vitest";
import type { z } from "zod";
import * as C from "../src/index.js";

// CL-05: valid and invalid examples for every schema.
const ID = "665f00000000000000000001";
const ok = (schema: z.ZodType, value: unknown) => expect(schema.safeParse(value).success, JSON.stringify(value)).toBe(true);
const fieldsOf = (schema: z.ZodType, value: unknown) => {
    const r = schema.safeParse(value);
    expect(r.success, JSON.stringify(value)).toBe(false);
    return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("shared", () => {
    it("roles, staff roles and ids", () => {
        ok(C.Role, "chef");
        expect(fieldsOf(C.Role, "admin")).toEqual([""]);
        expect(fieldsOf(C.StaffRole, "owner")).toEqual([""]);
        ok(C.ObjectId, ID);
        fieldsOf(C.ObjectId, "nope");
        expect(C.ROLES).toEqual(["owner", "cashier", "chef"]);
    });

    it("text is trimmed and bounded; a label also takes a number", () => {
        expect(C.text(5).parse("  hi  ")).toBe("hi");
        fieldsOf(C.text(5), "   ");
        fieldsOf(C.text(5), "toolong");
        expect(C.text(5).safeParse(7).error?.issues[0].message).toBe("Must be text");
        expect(C.text(5).safeParse(undefined).error?.issues[0].message).toBe("Required"); // a missing field
        expect(C.label(5).parse(7)).toBe("7");
        expect(C.Email.parse(" BOB@X.test ")).toBe("bob@x.test");
        fieldsOf(C.Email, "not-an-email");
    });
});

describe("menu", () => {
    it("CreateItemBody: name, price (a number from 0, numeric text too) and image; unknown fields dropped", () => {
        const item = C.CreateItemBody.parse({ name: " Amok ", price: "5.5", image: "/x.png", resId: "smuggled" });
        expect(item).toEqual({ name: "Amok", price: 5.5, image: "/x.png" });
        expect(fieldsOf(C.CreateItemBody, { name: "", price: -1 }).sort()).toEqual(["image", "name", "price"]);
        expect(fieldsOf(C.CreateItemBody, { name: "A", price: "abc", image: "/x" })).toEqual(["price"]);
        expect(fieldsOf(C.CreateItemBody, { name: "A", price: 1, image: "/x", isEnabled: "yes" })).toEqual(["isEnabled"]);
    });

    it("UpdateItemBody: any subset, each still checked", () => {
        ok(C.UpdateItemBody, {});
        ok(C.UpdateItemBody, { price: 6 });
        expect(fieldsOf(C.UpdateItemBody, { price: "abc" })).toEqual(["price"]);
    });

    it("AvailabilityBody: true or false", () => {
        ok(C.AvailabilityBody, { isEnabled: false });
        expect(fieldsOf(C.AvailabilityBody, { isEnabled: "no" })).toEqual(["isEnabled"]);
        expect(fieldsOf(C.AvailabilityBody, {})).toEqual(["isEnabled"]);
    });

    it("CreateTableBody: a manual table needs a name of up to 40 characters; others need nothing", () => {
        ok(C.CreateTableBody, {});
        ok(C.CreateTableBody, { type: "auto", name: "" });
        ok(C.CreateTableBody, { type: "manual", name: "Patio" });
        expect(fieldsOf(C.CreateTableBody, { type: "manual", name: "  " })).toEqual(["name"]);
        expect(fieldsOf(C.CreateTableBody, { type: "manual", name: "x".repeat(41) })).toEqual(["name"]);
        expect(fieldsOf(C.CreateTableBody, { type: "manual" })).toEqual(["name"]);
    });

    it("UpdateTableBody, and the response shapes", () => {
        ok(C.UpdateTableBody, { name: "Window", isEnabled: true });
        expect(fieldsOf(C.UpdateTableBody, { name: "" })).toEqual(["name"]);
        ok(C.MenuItem, { _id: ID, name: "A", price: 1, image: "/x", isEnabled: true });
        fieldsOf(C.MenuItem, { _id: ID, name: "A", price: "1", image: "/x", isEnabled: true });
        ok(C.Table, { _id: ID, name: "1", isEnabled: false });
        ok(C.UploadedPhoto, { url: "/api/menu/x/images/" + ID });
    });
});

describe("menu categories (VM-25)", () => {
    it("a category's name, and a new order as every id once", () => {
        expect(C.CategoryBody.parse({ name: " Drinks " })).toEqual({ name: "Drinks" });
        expect(fieldsOf(C.CategoryBody, { name: "" })).toEqual(["name"]);
        expect(fieldsOf(C.CategoryBody, { name: "x".repeat(41) })).toEqual(["name"]);
        ok(C.ReorderCategoriesBody, { ids: [ID] });
        expect(fieldsOf(C.ReorderCategoriesBody, { ids: ["nope"] })).toEqual(["ids.0"]);
        ok(C.Category, { _id: ID, name: "Drinks", sortOrder: 0 });
    });

    it("an item may name a category, or none (Other)", () => {
        expect(C.CreateItemBody.parse({ name: "Tea", price: 1, image: "/x", categoryId: ID }).categoryId).toBe(ID);
        expect(C.UpdateItemBody.parse({ categoryId: null })).toEqual({ categoryId: null });
        expect(fieldsOf(C.UpdateItemBody, { categoryId: "drinks" })).toEqual(["categoryId"]);
        ok(C.MenuItem, { _id: ID, name: "Tea", price: 1, image: "/x", isEnabled: true, categoryId: null });
    });

    it("the public menu is sections of dishes; Other has no id", () => {
        const tea = { _id: ID, name: "Tea", price: 1, image: "/x", isEnabled: true };
        ok(C.PublicMenu, {
            categories: [
                { _id: ID, name: "Drinks", items: [tea] },
                { _id: null, name: "Other", items: [] },
            ],
        });
        fieldsOf(C.PublicMenu, [tea]);
    });
});

describe("internal calls", () => {
    const line = { item: { _id: ID, name: "Amok", price: 5, image: "/x", isEnabled: true }, quantity: 2 };

    it("OrderCheckRequest: a table and 1 to 100 lines of an id and 1 to 99", () => {
        ok(C.OrderCheckRequest, { table: "1", items: [{ _id: ID, quantity: 1 }] });
        expect(fieldsOf(C.OrderCheckRequest, { table: "1", items: [] })).toEqual(["items"]);
        expect(fieldsOf(C.OrderCheckRequest, { table: "1", items: [{ _id: "x", quantity: 0 }] }).sort()).toEqual([
            "items.0._id",
            "items.0.quantity",
        ]);
        expect(fieldsOf(C.OrderCheckRequest, { items: [{ _id: ID, quantity: 1.5 }] }).sort()).toEqual(["items.0.quantity", "table"]);
        fieldsOf(C.OrderCheckRequest, { table: "1", items: Array(101).fill({ _id: ID, quantity: 1 }) });
    });

    it("OrderCheckResponse, MenuCounts and RestaurantRef", () => {
        ok(C.OrderCheckResponse, { items: [line] });
        expect(fieldsOf(C.OrderCheckResponse, { items: [{ ...line, item: { ...line.item, price: "5" } }] })).toEqual([
            "items.0.item.price",
        ]);
        fieldsOf(C.OrderCheckResponse, { items: [] });
        ok(C.MenuCounts, { numOfTables: 4, numOfActiveTables: 2, numOfItems: 10 });
        fieldsOf(C.MenuCounts, { numOfTables: -1, numOfActiveTables: 2, numOfItems: 10 });
        ok(C.RestaurantRef, { _id: ID, name: "A", slug: "a", ownerId: "o" });
        fieldsOf(C.RestaurantRef, { _id: ID, name: "A" });
        ok(C.RestaurantRefList, [{ _id: ID, name: "A", slug: "a", ownerId: "o" }]);
    });
});

describe("orders", () => {
    const order = {
        _id: ID,
        table: "1",
        status: "pending",
        createdAt: "2026-11-23T10:00:00.000Z",
        orderedItems: [{ item: { _id: ID, name: "Amok", price: 5, image: "/x", isEnabled: true }, quantity: 1 }],
    };

    it("PlaceOrderBody: the table (text or number) and lines of an item id and 1 to 99; the browser's price is dropped", () => {
        const body = C.PlaceOrderBody.parse({ table: 7, isDone: true, orderedItems: [{ item: { _id: ID, price: 0 }, quantity: 2 }] });
        expect(body).toEqual({ table: "7", orderedItems: [{ item: { _id: ID }, quantity: 2 }] });
        expect(fieldsOf(C.PlaceOrderBody, { table: "", orderedItems: [] }).sort()).toEqual(["orderedItems", "table"]);
        expect(fieldsOf(C.PlaceOrderBody, { table: "1", orderedItems: [{ item: {}, quantity: 100 }] }).sort()).toEqual([
            "orderedItems.0.item._id",
            "orderedItems.0.quantity",
        ]);
    });

    it("UpdateBillBody takes isPaid, or the old isPayed for one release (CL-06)", () => {
        expect(C.UpdateBillBody.parse({ isPaid: true })).toEqual({ isPaid: true });
        expect(C.UpdateBillBody.parse({ isPayed: false })).toEqual({ isPaid: false });
        expect(C.UpdateBillBody.parse({ isPaid: true, isPayed: false })).toEqual({ isPaid: true });
        expect(fieldsOf(C.UpdateBillBody, {})).toEqual(["isPaid"]);
        expect(fieldsOf(C.UpdateBillBody, { isPayed: "yes" })).toEqual(["isPaid"]);
        ok(C.Bill, { _id: ID, table: "1", isPaid: true, orders: [], createdAt: "2026-11-23T10:00:00.000Z" });
        fieldsOf(C.Bill, { _id: ID, table: "1", isPayed: true, orders: [], createdAt: "2026-11-23T10:00:00.000Z" });
    });

    it("UpdateBillBody, Order, Bill and the pages", () => {
        ok(C.UpdateBillBody, { isPaid: true });
        expect(fieldsOf(C.UpdateBillBody, { isPaid: "yes" })).toEqual(["isPaid"]);
        ok(C.Order, order);
        fieldsOf(C.Order, { ...order, status: "done" });
        ok(C.Bill, { _id: ID, table: "1", isPaid: false, orders: [order], createdAt: order.createdAt });
        ok(C.KitchenHistoryPage, { orders: [order], page: 1, limit: 20, total: 1, pages: 1 });
        fieldsOf(C.PaidBillsPage, { bills: [], page: 1, limit: 20, total: 1 });
    });

    it("what a customer sees, and the dashboards", () => {
        const view = {
            _id: ID,
            number: "000001",
            status: "pending",
            table: "1",
            placedAt: order.createdAt,
            lines: [{ name: "Amok", price: 5, quantity: 1, total: 5 }],
            total: 5,
        };
        ok(C.TableOrderView, view);
        ok(C.TableBill, { table: "1", orders: [view], total: 5 });
        const six = { numOfTables: 1, numOfActiveTables: 1, numOfItems: 1, numOfOrders: 1, numOfUnpaidOrders: 0, numOfPayments: 1 };
        ok(C.Overview, six);
        ok(C.OwnerRestaurantOverview, { ...six, resId: ID, resName: "A" });
        fieldsOf(C.OwnerRestaurantOverview, six);
        ok(C.OwnerOverview, {
            numOfUnpaidOrders: 0,
            numOfItems: 1,
            numOfOrders: 1,
            numOfPayments: 1,
            numOfMoneyEarned: 5,
            totalItemsSold: 1,
            avgItemsPerOrder: 1,
            topSellingItems: [{ name: "Amok", quantity: 1 }],
        });
    });
});

describe("order status (VM-27)", () => {
    it("five statuses, and the one step after each", () => {
        expect(C.ORDER_STATUSES).toEqual(["pending", "preparing", "ready", "served", "cancelled"]);
        expect(C.NEXT_STATUS).toEqual({ pending: "preparing", preparing: "ready", ready: "served" });
        ok(C.UpdateOrderStatusBody, { status: "ready" });
        expect(fieldsOf(C.UpdateOrderStatusBody, { status: "done" })).toEqual(["status"]);
        expect(C.CancelOrderBody.parse({ reason: " Wrong dish " })).toEqual({ reason: "Wrong dish" });
        expect(fieldsOf(C.CancelOrderBody, { reason: "" })).toEqual(["reason"]);
        expect(fieldsOf(C.CancelOrderBody, { reason: "x".repeat(201) })).toEqual(["reason"]);
    });

    it("an order has a status and its history; no isDone", () => {
        const order = {
            _id: ID,
            table: "1",
            status: "cancelled",
            statusHistory: [{ status: "pending", at: "2026-11-23T10:00:00.000Z", by: "customer" }],
            cancelReason: "Wrong dish",
            createdAt: "2026-11-23T10:00:00.000Z",
            orderedItems: [],
        };
        ok(C.Order, order);
        expect(fieldsOf(C.Order, { ...order, status: "done" })).toEqual(["status"]);
    });
});

describe("restaurants", () => {
    it("sign-up and login bodies", () => {
        ok(C.IdTokenBody, { idToken: "eyJ..." });
        expect(fieldsOf(C.IdTokenBody, {})).toEqual(["idToken"]);
        ok(C.OwnerIdQuery, { ownerId: "owner1" });
        expect(fieldsOf(C.OwnerIdQuery, {})).toEqual(["ownerId"]);
        ok(C.SignupBody, { ownerName: "Alice", resName: "Mee Keav" });
        expect(fieldsOf(C.SignupBody, { ownerName: "Alice" })).toEqual(["resName"]);
        ok(C.LoginBody, { role: "owner" });
        ok(C.LoginBody, { role: "chef", resSlug: "mee-keav-abc123" });
        expect(fieldsOf(C.LoginBody, { role: "admin" })).toEqual(["role"]);
        ok(C.LoginResponse, { role: "cashier" });
        ok(C.SignupResponse, { message: "Account created", slug: "x" });
    });

    it("restaurant and staff bodies", () => {
        ok(C.CreateRestaurantBody, { name: "Second" });
        expect(fieldsOf(C.CreateRestaurantBody, {})).toEqual(["name"]);
        // VM-12: an invite is name, email and role; an account id sent with it is dropped
        expect(C.AddStaffBody.parse({ name: "Bob", email: "BOB@x.test", tenantId: "bob", role: "chef" })).toEqual({
            name: "Bob",
            email: "bob@x.test",
            role: "chef",
        });
        expect(fieldsOf(C.AddStaffBody, { name: "Bob", email: "bob", role: "owner" }).sort()).toEqual(["email", "role"]);
        ok(C.UpdateStaffBody, {});
        expect(fieldsOf(C.UpdateStaffBody, { role: "owner" })).toEqual(["role"]);
    });

    it("response shapes", () => {
        ok(C.Restaurant, { _id: ID, name: "A", slug: "a", ownerId: "o" });
        const member = {
            _id: ID,
            name: "Bob",
            tenantId: "bob",
            email: "bob@x.test",
            role: "chef",
            resId: ID,
            createdAt: "2026-11-23T10:00:00.000Z",
            updatedAt: "2026-11-23T10:00:00.000Z",
        };
        fieldsOf(C.StaffMember, { ...member, createdAt: undefined });
        ok(C.StaffMember, member);
        ok(C.StaffMember, { ...member, tenantId: null }); // an invite nobody has accepted yet (VM-12)
        ok(C.StaffOverview, [{ resName: "A", staff: [member] }]);
        ok(C.Memberships, { "Mee Keav - mee-keav-abc123": ["owner", "chef"] });
        fieldsOf(C.Memberships, { "A - a": ["admin"] });
    });
});
