import { NextRequest } from "next/server";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { roleForPath } from "@/lib/session";
import { server } from "../msw";

// SEC-12: one session cookie per role, so an owner who also signs in to the cashier or kitchen screen
// stays signed in as owner. Each request says which screen it comes from.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (claims: object) => `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(Date.now() / 1000) + 600, ...claims })}.sig`;
const owner = token({ role: "owner" });
const cashierOfA = token({ role: "cashier", resSlug: "rest-a" });

function visit(path: string, cookie: string) {
    const res = middleware(new NextRequest(`https://v-menu.example${path}`, { headers: { cookie } }));
    const to = res.headers.get("location");
    return to ? new URL(to).pathname : "stays";
}

describe("pages read their own role's cookie (SEC-12)", () => {
    it("an owner signed in as cashier too stays on the owner pages and the cashier pages", () => {
        const jar = `__Host-vmenu_owner=${owner}; __Host-vmenu_cashier=${cashierOfA}`;
        expect(visit("/owner", jar)).toBe("stays");
        expect(visit("/owner/tables", jar)).toBe("stays");
        expect(visit("/rest-a/cashier/dashboard", jar)).toBe("stays");
    });

    it("a page with no sign-in for its role goes to that role's login", () => {
        expect(visit("/rest-a/kitchen", `__Host-vmenu_owner=${owner}`)).toBe("/rest-a/kitchen/login");
        expect(visit("/owner/tables", `__Host-vmenu_cashier=${cashierOfA}`)).toBe("/owner/login");
    });

    it("another app's token cookie is not a sign-in", () => {
        expect(visit("/owner", `token=${owner}`)).toBe("/owner/login");
        expect(visit("/owner", `token=not-a-jwt; __Host-vmenu_owner=${owner}`)).toBe("stays");
    });

    it("plain-http names work for local dev", () => {
        expect(visit("/owner", `vmenu_owner=${owner}`)).toBe("stays");
    });
});

describe("requests say which screen they come from (SEC-12)", () => {
    afterEach(() => window.history.replaceState(null, "", "/"));

    it("maps pages to roles", () => {
        expect(roleForPath("/owner/tables")).toBe("owner");
        expect(roleForPath("/rest-a/cashier/dashboard")).toBe("cashier");
        expect(roleForPath("/rest-a/kitchen")).toBe("chef");
        expect(roleForPath("/rest-a/customer/T1")).toBeNull();
    });

    it("the API client sends the page's role", async () => {
        let role: string | null = "unset";
        server.use(
            http.get("/api/menu/rest-a/tables", ({ request }) => {
                role = request.headers.get("x-vmenu-role");
                return HttpResponse.json([]);
            }),
        );
        window.history.replaceState(null, "", "/rest-a/cashier/tables");
        const { api } = await import("@/lib/api");
        await api.get("/api/menu/rest-a/tables");
        expect(role).toBe("cashier");
    });

    it("signing out ends only this screen's session", async () => {
        let role: string | null = "unset";
        server.use(
            http.post("*/api/auth/logout", ({ request }) => {
                role = request.headers.get("x-vmenu-role");
                return HttpResponse.json({ message: "Signed out" });
            }),
        );
        window.history.replaceState(null, "", "/rest-a/kitchen");
        const { signOut } = await import("@/lib/session");
        expect(await signOut()).toBe(true);
        expect(role).toBe("chef");
    });
});
