// Test helpers shared by the services (SEC-07). Imported as "@vmenu/common/testing", never by
// production code.
import { createRequire } from "node:module";
import type { Express } from "express";

// Express 5 (router 2) doesn't keep a layer's path once it's compiled, so the inventory records it
// as routes are registered. Call trackRoutes() before the app is created.
type Layer = { route?: { methods: Record<string, boolean> }; handle?: { stack?: Layer[] }; __path?: string };
type RouterProto = { use: (...args: unknown[]) => unknown; route: (path: string) => unknown; stack: Layer[] };

let tracking = false;
export function trackRoutes() {
    if (tracking) return;
    tracking = true;
    // the same "router" module express uses
    const require = createRequire(createRequire(import.meta.url).resolve("express"));
    const Router = require("router") as { prototype: RouterProto };
    const proto = Router.prototype;
    const use = proto.use;
    proto.use = function (this: RouterProto, ...args: unknown[]) {
        const before = this.stack.length;
        const path = typeof args[0] === "string" ? args[0] : "/";
        const out = use.apply(this, args);
        for (const layer of this.stack.slice(before)) layer.__path = path;
        return out;
    };
    const route = proto.route;
    proto.route = function (this: RouterProto, path: string) {
        const out = route.call(this, path);
        const layer = this.stack[this.stack.length - 1];
        if (layer) layer.__path = path;
        return out;
    };
}

const join = (a: string, b: string) => (a + (b === "/" ? "" : b)).replace(/\/+/g, "/") || "/";

/** Every route the app answers, as "METHOD /path/:param", sorted. Needs trackRoutes() first. */
export function listRoutes(app: Express): string[] {
    const found = new Set<string>();
    const walk = (stack: Layer[], prefix: string) => {
        for (const layer of stack) {
            const path = layer.__path ?? "/";
            if (layer.route) {
                for (const [method, on] of Object.entries(layer.route.methods))
                    if (on && method !== "_all") found.add(`${method.toUpperCase()} ${join(prefix, path)}`);
            } else if (layer.handle?.stack) walk(layer.handle.stack, join(prefix, path));
        }
    };
    walk((app as unknown as { router: { stack: Layer[] } }).router.stack, "");
    return [...found].sort();
}

// ---------------- access-control matrix (SEC-07) ----------------

/** Who calls. Customers never sign in, so "guest" is both "no login" and "customer". */
export const CALLERS = ["guest", "forged", "chef", "cashier", "owner", "otherChef", "otherCashier", "otherOwner"] as const;
export type Caller = (typeof CALLERS)[number];
/** "ok" = let through (any answer but 401 or 403); otherwise the exact refusal. */
export type Access = "ok" | 401 | 403;
export type AccessRow = Record<Caller, Access>;

const every = (access: Access): AccessRow => Object.fromEntries(CALLERS.map((c) => [c, access])) as AccessRow;

/** Anyone, signed in or not. */
export const PUBLIC: AccessRow = every("ok");
/** Not reachable with any app token (internal key or Firebase ID token routes): 401 for all. */
export const NO_APP_TOKEN: AccessRow = every(401);

/**
 * Only these roles, and only for restaurant A (the route has :slug). Staff of restaurant B are
 * refused even with an allowed role. With `ownData`, the route has no :slug and works on the
 * caller's own data, so B's staff with an allowed role are let through too.
 */
export function only(roles: Role[], { ownData = false } = {}): AccessRow {
    const row = { guest: 401, forged: 401 } as AccessRow;
    for (const role of ["chef", "cashier", "owner"] as const) {
        row[role] = roles.includes(role) ? "ok" : 403;
        const other = `other${role.charAt(0).toUpperCase()}${role.slice(1)}` as Caller;
        row[other] = roles.includes(role) && ownData ? "ok" : 403;
    }
    return row;
}

type Role = "owner" | "cashier" | "chef";

/** Request headers for every caller: A's staff, B's staff, a forged token, nobody. */
export async function callerHeaders(a: { _id: string; slug: string; ownerId: string }, b: { _id: string; slug: string; ownerId: string }) {
    const { signAppToken } = await import("./auth.js");
    const { SignJWT } = await import("jose");
    const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
    const staff = (r: typeof a, role: "chef" | "cashier") =>
        signAppToken({ uid: `${role}-${r._id}`, email: `${role}@${r.slug}.test`, role, resId: r._id, resSlug: r.slug });
    const forged = await new SignJWT({ uid: a.ownerId, email: "x@x.test", role: "owner" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("v-menu")
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode("not-the-real-secret-not-the-real-secret"));
    const headers: Record<Caller, Record<string, string>> = {
        guest: {},
        forged: bearer(forged),
        chef: bearer(await staff(a, "chef")),
        cashier: bearer(await staff(a, "cashier")),
        owner: bearer(await signAppToken({ uid: a.ownerId, email: "owner@a.test", role: "owner" })),
        otherChef: bearer(await staff(b, "chef")),
        otherCashier: bearer(await staff(b, "cashier")),
        otherOwner: bearer(await signAppToken({ uid: b.ownerId, email: "owner@b.test", role: "owner" })),
    };
    return headers;
}

/** The callers whose answer doesn't match the row, e.g. ["cashier: expected 403, got 200"]. */
export function mismatches(row: AccessRow, got: Record<Caller, number>) {
    return CALLERS.filter((c) => (row[c] === "ok" ? got[c] === 401 || got[c] === 403 : got[c] !== row[c])).map(
        (c) => `${c}: expected ${row[c] === "ok" ? "not 401/403" : row[c]}, got ${got[c]}`,
    );
}

// ---------------- shared setup for the services' tests (CL-14) ----------------

/** Where the run's one in-memory MongoDB is, set by `memoryMongoGlobalSetup` (a vitest globalSetup). */
const SHARED_URI = "VMENU_TEST_MONGO_URI";
let databases = 0;

/**
 * Connects mongoose to a fresh in-memory database for this test file. With the globalSetup below,
 * every file shares one MongoDB server and gets its own database (much faster than a server per
 * file); without it, the file starts its own server. Call `stop()` in afterAll.
 */
export async function startMemoryMongo(
    name = "test",
    options: { autoIndex?: boolean } = {},
): Promise<{ uri: string; stop: () => Promise<void> }> {
    const mongoose = (await import("mongoose")).default;
    const shared = process.env[SHARED_URI];
    let own: { getUri: (db?: string) => string; stop: () => Promise<boolean> } | undefined;
    if (!shared) {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        own = await MongoMemoryServer.create();
    }
    // a database of its own, so files running side by side never see each other's data
    const db = `${name}-${process.pid}-${Date.now().toString(36)}-${databases++}`;
    const uri = own ? own.getUri(db) : `${shared!.replace(/\/[^/]*$/, "")}/${db}`;
    await mongoose.connect(uri, options);
    return {
        uri,
        stop: async () => {
            if (shared) await mongoose.connection.dropDatabase().catch(() => {});
            await mongoose.disconnect();
            await own?.stop();
        },
    };
}

/** A vitest globalSetup: one in-memory MongoDB for the whole run. Use with startMemoryMongo(). */
export async function memoryMongoGlobalSetup() {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const server = await MongoMemoryServer.create();
    process.env[SHARED_URI] = server.getUri();
    return async () => {
        await server.stop();
    };
}

type Restaurant = { _id: string; slug: string; ownerId: string; name?: string };

/**
 * Request headers for someone signed in. An owner is the restaurant's owner; a cashier or chef is
 * staff of that restaurant. `claims` overrides any part of the token (uid, email, tv...).
 */
export async function tokenFor(
    role: Role,
    restaurant: Partial<Restaurant>,
    claims: Partial<{ uid: string; email: string; resId: string; resSlug: string; tv: number }> = {},
): Promise<{ authorization: string }> {
    const { signAppToken } = await import("./auth.js");
    const base =
        role === "owner"
            ? { uid: restaurant.ownerId ?? "owner1", email: `${restaurant.ownerId ?? "owner1"}@test.local`, role }
            : {
                  uid: `${role}-${restaurant._id}`,
                  email: `${role}@${restaurant.slug}.test`,
                  role,
                  resId: restaurant._id,
                  resSlug: restaurant.slug,
              };
    return { authorization: `Bearer ${await signAppToken({ ...base, ...claims })}` };
}

/**
 * Stands in for restaurant-service: answers the given restaurants by slug, 404 for the rest, and
 * 503 while `down()` says restaurant-service is down.
 */
export function fakeRestaurantLookup<R extends { slug: string }>(
    restaurants: R[] | Record<string, R>,
    { down = () => false }: { down?: () => boolean } = {},
) {
    const list = Array.isArray(restaurants) ? restaurants : Object.values(restaurants);
    return async (_req: unknown, slug: string): Promise<R> => {
        const { HttpError, notFound } = await import("./errors.js");
        if (down()) throw new HttpError(503, "A required service is unavailable");
        const found = list.find((r) => r.slug === slug);
        if (!found) throw notFound("Restaurant not found");
        return found;
    };
}
