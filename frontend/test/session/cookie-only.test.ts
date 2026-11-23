import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../msw";

// SEC-01: the frontend never keeps the login token where page scripts can read it.
const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
    });

describe("no token in page storage", () => {
    it("no code reads or writes a token in localStorage or sessionStorage", () => {
        const offenders = files(join(__dirname, "../../src")).filter((f) =>
            /(local|session)Storage\.(get|set)Item\(\s*["'`]token["'`]/.test(readFileSync(f, "utf8")),
        );
        expect(offenders).toEqual([]);
    });

    it("the API client sends the cookie, not an Authorization header, and drops an old stored token", async () => {
        localStorage.setItem("token", "old.token.from-before");
        let auth: string | null = "unset";
        server.use(
            http.get("/api/restaurants", ({ request }) => {
                auth = request.headers.get("authorization");
                return HttpResponse.json([]);
            }),
        );
        const { api } = await import("@/lib/api");
        expect(api.defaults.withCredentials).toBe(true);
        await api.get("/api/restaurants");
        expect(auth).toBeNull();
        expect(localStorage.getItem("token")).toBeNull();
    });

    it("signing in returns nothing to store", async () => {
        // even if a server still answered with the token, the client must not hand it on
        server.use(http.post("/api/auth/login", () => HttpResponse.json({ role: "owner", appToken: "eyJ.old.server" })));
        const { login } = await import("@/features/auth/api");
        expect(await login({ idToken: "x", role: "owner" })).toBeUndefined();
    });
});
