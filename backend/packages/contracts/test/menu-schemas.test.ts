import { describe, expect, it } from "vitest";
import * as C from "../src/index.js";
import { fieldsOf, ID, ok } from "./schema-helpers.js";

// CL-05: valid and invalid examples for every schema.
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
        expect(C.text(5).safeParse(7).error?.issues[0]!.message).toBe("Must be text");
        expect(C.text(5).safeParse(undefined).error?.issues[0]!.message).toBe("Required"); // a missing field
        expect(C.label(5).parse(7)).toBe("7");
        expect(C.Email.parse(" BOB@X.test ")).toBe("bob@x.test");
        fieldsOf(C.Email, "not-an-email");
    });
});

describe("menu", () => {
    it("CreateItemBody: name, price (a number from 0, numeric text too) and image; unknown fields dropped", () => {
        const item = C.CreateItemBody.parse({ name: " Amok ", price: "5.5", image: "/x.png", resId: "smuggled" });
        expect(item).toEqual({ name: "Amok", priceCents: 550, image: "/x.png" });
        expect(fieldsOf(C.CreateItemBody, { name: "", priceCents: -1 }).sort()).toEqual(["image", "name", "priceCents"]);
        expect(fieldsOf(C.CreateItemBody, { name: "A", priceCents: "abc", image: "/x" })).toEqual(["priceCents"]);
        expect(fieldsOf(C.CreateItemBody, { name: "A", priceCents: 100, image: "/x", isEnabled: "yes" })).toEqual(["isEnabled"]);
    });

    it("a price is whole cents from 0; anything else is refused, never turned into 0 (VM-17, CL-07)", () => {
        const cents = (value: unknown) => C.UpdateItemBody.safeParse({ priceCents: value });
        expect(cents(0).data).toEqual({ priceCents: 0 });
        expect(cents(235).data).toEqual({ priceCents: 235 });
        for (const bad of ["", "  ", null, true, [], "abc", "250", -5, 2.5]) expect(cents(bad).success, JSON.stringify(bad)).toBe(false);
        expect(cents(-5).error?.issues[0]!.message).toBe("Can't be negative");
        expect(cents(2.5).error?.issues[0]!.message).toBe("Must be a whole number of cents");
    });

    it("the old dollar price keeps VM-17's checks and messages, under `price` (VM-17, CL-07)", () => {
        const price = (value: unknown) => C.UpdateItemBody.safeParse({ price: value });
        expect(price(0).data).toEqual({ priceCents: 0 });
        expect(price(" 2.5 ").data).toEqual({ priceCents: 250 });
        expect(price(2.35).data).toEqual({ priceCents: 235 });
        for (const bad of ["", "  ", null, true, [], "abc", "1e999", -5, "-1", 1e300])
            expect(price(bad).success, JSON.stringify(bad)).toBe(false);
        expect(price(-5).error?.issues[0]).toMatchObject({ path: ["price"], message: "Must be 0 or more" });
        expect(price("").error?.issues[0]!.message).toBe("Required");
        expect(price("abc").error?.issues[0]!.message).toBe("Must be a number");
        // money has cents: the form's old step="0.01" stopped this only in the browser
        expect(price(2.555).error?.issues[0]!.message).toBe("At most 2 decimal places");
        expect(price(1e300).error?.issues[0]!.message).toBe("At most $1,000,000");
        // the other fields are still checked alongside it
        expect(fieldsOf(C.CreateItemBody, { name: "", price: -1 }).sort()).toEqual(["image", "name", "price"]);
    });

    it("UpdateItemBody: any subset, each still checked", () => {
        ok(C.UpdateItemBody, {});
        ok(C.UpdateItemBody, { priceCents: 600 });
        expect(fieldsOf(C.UpdateItemBody, { priceCents: "abc" })).toEqual(["priceCents"]);
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
        ok(C.MenuItem, { _id: ID, name: "A", priceCents: 100, image: "/x", isEnabled: true });
        fieldsOf(C.MenuItem, { _id: ID, name: "A", priceCents: "1", image: "/x", isEnabled: true });
        ok(C.Table, { _id: ID, name: "1", isEnabled: false, qrToken: "AbCdEfGhIjKlMnOpQrSt_-" });
        ok(C.UploadedPhoto, { url: "/api/menu/x/images/" + ID });
    });
});

describe("dish descriptions and tags (VM-26)", () => {
    const dish = { name: "Amok", priceCents: 500, image: "/x.png" };
    it("a description is optional, trimmed, up to 300 characters, and can be emptied", () => {
        expect(C.CreateItemBody.parse({ ...dish, description: "  Steamed fish curry  " }).description).toBe("Steamed fish curry");
        expect(C.UpdateItemBody.parse({ description: "   " })).toEqual({ description: "" });
        ok(C.CreateItemBody, { ...dish, description: "x".repeat(300) });
        expect(fieldsOf(C.CreateItemBody, { ...dish, description: "x".repeat(301) })).toEqual(["description"]);
        expect(fieldsOf(C.CreateItemBody, { ...dish, description: 7 })).toEqual(["description"]);
    });

    it("tags come from the fixed list, each once", () => {
        expect(C.DISH_TAGS).toEqual(expect.arrayContaining(["vegetarian", "spicy", "contains nuts"]));
        expect(C.CreateItemBody.parse({ ...dish, tags: ["spicy", "vegetarian", "spicy"] }).tags).toEqual(["spicy", "vegetarian"]);
        expect(C.UpdateItemBody.parse({ tags: [] })).toEqual({ tags: [] });
        expect(fieldsOf(C.CreateItemBody, { ...dish, tags: ["tasty"] })).toEqual(["tags.0"]);
        expect(fieldsOf(C.CreateItemBody, { ...dish, tags: "spicy" })).toEqual(["tags"]);
    });

    it("a dish from the API may carry them; older dishes have neither", () => {
        const id = "665f00000000000000000001";
        ok(C.MenuItem, { _id: id, ...dish, isEnabled: false, description: "Hot", tags: ["spicy"] });
        ok(C.MenuItem, { _id: id, ...dish, isEnabled: true });
    });
});

describe("table links (SEC-04)", () => {
    const TOKEN = "AbCdEfGhIjKlMnOpQrSt_-";
    const line = { item: { _id: "665f00000000000000000001" }, quantity: 1 };

    it("a link token is 16 random bytes in base64url", () => {
        ok(C.QrToken, TOKEN);
        for (const bad of ["", "short", `${TOKEN}x`, "AbCdEfGhIjKlMnOpQrSt/+", 7]) expect(C.QrToken.safeParse(bad).success).toBe(false);
    });

    it("an order names its table by link token, or by name; never both, never neither", () => {
        expect(C.PlaceOrderBody.parse({ qrToken: TOKEN, orderedItems: [line] })).toEqual({ qrToken: TOKEN, orderedItems: [line] });
        ok(C.PlaceOrderBody, { table: "1", orderedItems: [line] });
        expect(fieldsOf(C.PlaceOrderBody, { qrToken: TOKEN, table: "1", orderedItems: [line] })).toEqual(["table"]);
        expect(fieldsOf(C.PlaceOrderBody, { orderedItems: [line] })).toEqual(["table"]);
        expect(fieldsOf(C.PlaceOrderBody, { qrToken: "nope", orderedItems: [line] })).toEqual(["qrToken"]);
    });

    it("so does the order check, and its answer says which table it was", () => {
        const items = [{ _id: "665f00000000000000000001", quantity: 1 }];
        ok(C.OrderCheckRequest, { qrToken: TOKEN, items });
        expect(fieldsOf(C.OrderCheckRequest, { items })).toEqual(["table"]);
        const dish = { _id: "665f00000000000000000001", name: "A", priceCents: 100, image: "/x", isEnabled: true };
        expect(C.OrderCheckResponse.parse({ table: "T1", items: [{ item: dish, quantity: 1 }] }).table).toBe("T1");
    });

    it("what a customer learns from a token is only the table's name and whether it's open", () => {
        expect(C.TableLink.parse({ table: "T1", isOpen: true, qrToken: TOKEN, _id: "x" })).toEqual({ table: "T1", isOpen: true });
    });
});

describe("a table's unpaid bill (VM-15)", () => {
    it("order-service answers whether one is open", () => {
        ok(C.OpenBillCheck, { open: true });
        fieldsOf(C.OpenBillCheck, { open: "yes" });
    });
});

describe("public restaurant info (VM-21)", () => {
    it("is only a name and a slug: anything else is dropped", () => {
        const safe = C.PublicRestaurant.parse({ name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1", email: "o@x.com" });
        expect(safe).toEqual({ name: "Mee Keav", slug: "mee-keav-abc123" });
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
        expect(C.CreateItemBody.parse({ name: "Tea", priceCents: 100, image: "/x", categoryId: ID }).categoryId).toBe(ID);
        expect(C.UpdateItemBody.parse({ categoryId: null })).toEqual({ categoryId: null });
        expect(fieldsOf(C.UpdateItemBody, { categoryId: "drinks" })).toEqual(["categoryId"]);
        ok(C.MenuItem, { _id: ID, name: "Tea", priceCents: 100, image: "/x", isEnabled: true, categoryId: null });
    });

    it("the public menu is sections of dishes; Other has no id", () => {
        const tea = { _id: ID, name: "Tea", priceCents: 100, image: "/x", isEnabled: true };
        ok(C.PublicMenu, {
            categories: [
                { _id: ID, name: "Drinks", items: [tea] },
                { _id: null, name: "Other", items: [] },
            ],
        });
        fieldsOf(C.PublicMenu, [tea]);
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
        ok(C.Me, { name: "Ory", email: "ory@x.test", role: "owner" }); // VM-20
        ok(C.Memberships, { "Mee Keav - mee-keav-abc123": ["owner", "chef"] });
        fieldsOf(C.Memberships, { "A - a": ["admin"] });
    });
});
