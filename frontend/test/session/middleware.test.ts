import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

// VM-19: a staff token works only on its own restaurant's pages.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (claims: object) => `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(Date.now() / 1000) + 600, ...claims })}.sig`;
const cashierOfA = token({ role: "cashier", resSlug: "rest-a" });
const chefOfA = token({ role: "chef", resSlug: "rest-a" });

// SEC-12: the token under every role's cookie name, so these cases test the token, not the name
const asEveryRole = (t: string) => ["owner", "cashier", "chef"].map((r) => `vmenu_${r}=${t}`).join("; ");

function visit(path: string, cookie?: string) {
    const res = middleware(new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: asEveryRole(cookie) } : {} }));
    const to = res.headers.get("location");
    return to ? new URL(to).pathname : "stays";
}

describe("staff pages check the restaurant (VM-19)", () => {
    it("a cashier of A stays on A's pages", () => {
        expect(visit("/rest-a/cashier/dashboard", cashierOfA)).toBe("stays");
    });

    it("a cashier of A opening B's dashboard goes to B's login", () => {
        expect(visit("/rest-b/cashier/dashboard", cashierOfA)).toBe("/rest-b/cashier/login");
    });

    it("a chef of A opening B's kitchen, or its history, goes to B's kitchen login", () => {
        expect(visit("/rest-a/kitchen", chefOfA)).toBe("stays");
        expect(visit("/rest-b/kitchen", chefOfA)).toBe("/rest-b/kitchen/login");
        expect(visit("/rest-b/kitchen/history", chefOfA)).toBe("/rest-b/kitchen/login");
    });

    it("B's login page itself stays open, so there's no redirect loop", () => {
        expect(visit("/rest-b/cashier/login", cashierOfA)).toBe("stays");
        expect(visit("/rest-b/kitchen/login", chefOfA)).toBe("stays");
    });

    it("a staff token with no restaurant counts as the wrong restaurant", () => {
        expect(visit("/rest-a/cashier/dashboard", token({ role: "cashier" }))).toBe("/rest-a/cashier/login");
    });

    it("the role check still works, and owners and customers are unaffected", () => {
        expect(visit("/rest-a/kitchen", cashierOfA)).toBe("/rest-a/kitchen/login");
        expect(visit("/owner", token({ role: "owner" }))).toBe("stays");
        expect(visit("/rest-b/customer/T1")).toBe("stays");
        expect(visit("/rest-b/cashier/dashboard")).toBe("/rest-b/cashier/login");
    });
});
