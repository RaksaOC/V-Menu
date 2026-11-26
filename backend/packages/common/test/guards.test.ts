import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    assertId,
    assertRestaurantAccess,
    callService,
    errorHandler,
    forbidden,
    HttpError,
    lookupRestaurant,
    requireEnv,
    requireInternal,
    requireRole,
    signAppToken,
    type AppUser,
} from "../src/index.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const owner: AppUser = { uid: "owner1", email: "o@x.com", role: "owner" };
const cashier: AppUser = { uid: "c1", email: "c@x.com", role: "cashier", resId: "665f00000000000000000001", resSlug: "mee-keav" };

// A tiny app that uses each guard the way the services do.
const app = express();
app.get("/owner", requireRole("owner"), (req, res) => {
    res.json(req.user);
});
app.get("/internal", requireInternal, (_req, res) => {
    res.json({ ok: true });
});
app.get("/id/:id", (req, res) => {
    assertId(req.params.id, "item id");
    res.json({ ok: true });
});
app.get("/invalid", () => {
    throw new mongoose.Error.ValidationError();
});
app.use(errorHandler);

describe("app tokens", () => {
    it("lets the right role in and puts the user on the request", async () => {
        const token = await signAppToken(owner);
        const res = await request(app).get("/owner").set("authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject(owner);
    });

    it("reads the token from the cookie too", async () => {
        const token = await signAppToken(owner);
        expect((await request(app).get("/owner").set("cookie", `theme=dark; __Host-vmenu_owner=${token}`)).status).toBe(200);
    });

    it("answers 401 without a token or with a bad one, 403 for the wrong role", async () => {
        expect((await request(app).get("/owner")).status).toBe(401);
        expect((await request(app).get("/owner").set("authorization", "Bearer nope")).body).toEqual({
            message: "Invalid or expired token",
        });
        const expired = await signAppToken(owner, "-1s");
        expect((await request(app).get("/owner").set("authorization", `Bearer ${expired}`)).status).toBe(401);
        const staff = await signAppToken(cashier);
        expect((await request(app).get("/owner").set("authorization", `Bearer ${staff}`)).status).toBe(403);
    });

    it("ties owners to their own restaurants and staff to theirs", () => {
        const mine = { _id: "665f00000000000000000001", ownerId: "owner1" };
        const other = { _id: "665f00000000000000000002", ownerId: "owner2" };
        expect(() => assertRestaurantAccess(owner, mine)).not.toThrow();
        expect(() => assertRestaurantAccess(owner, other)).toThrow("No access to this restaurant");
        expect(() => assertRestaurantAccess(cashier, mine)).not.toThrow();
        expect(() => assertRestaurantAccess(cashier, other)).toThrow(HttpError);
    });
});

describe("errors", () => {
    it("rejects an invalid id with a 400 naming it", async () => {
        const res = await request(app).get("/id/not-an-id");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid item id" });
        expect((await request(app).get("/id/665f00000000000000000001")).status).toBe(200);
    });

    it("turns a database validation error into a 400", async () => {
        expect((await request(app).get("/invalid")).status).toBe(400);
    });

    it("keeps the status of known errors", () => {
        expect(forbidden().status).toBe(403);
        expect(new HttpError(409, "Busy").message).toBe("Busy");
    });
});

describe("internal routes", () => {
    it("need the shared key", async () => {
        expect((await request(app).get("/internal")).status).toBe(401);
        expect((await request(app).get("/internal").set("x-internal-key", "wrong-key-same-len")).status).toBe(401);
        expect((await request(app).get("/internal").set("x-internal-key", "internal-test-key")).status).toBe(200);
    });
});

describe("calling another service", () => {
    // Stand-in for another service: echoes what it got, or fails on purpose.
    let server: Server;
    let base: string;
    beforeAll(async () => {
        server = createServer((req, res) => {
            const status =
                req.url === "/missing" || req.url === "/closed" ? (req.url === "/closed" ? 409 : 404) : req.url === "/broken" ? 500 : 200;
            res.writeHead(status, { "content-type": "application/json" });
            res.end(
                JSON.stringify(
                    status === 200
                        ? { key: req.headers["x-internal-key"], requestId: req.headers["x-request-id"] }
                        : req.url === "/closed"
                          ? { message: "Table is not available", code: "TABLE_CLOSED" }
                          : { message: "No such restaurant" },
                ),
            );
        });
        await new Promise<void>((resolve) => server.listen(0, resolve));
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(() => {
        server.close();
    });
    const fakeReq = { id: "req-1", log: undefined } as unknown as express.Request;

    it("sends the internal key and the request id", async () => {
        expect(await callService(base, "/ok", fakeReq)).toEqual({ key: "internal-test-key", requestId: "req-1" });
    });

    it("passes 4xx answers on and turns 5xx into 502", async () => {
        await expect(callService(base, "/missing", fakeReq)).rejects.toMatchObject({ status: 404, message: "No such restaurant" });
        await expect(callService(base, "/broken", fakeReq)).rejects.toMatchObject({ status: 502 });
    });

    it("keeps the other service's error code, so the browser can tell errors apart (VM-06)", async () => {
        await expect(callService(base, "/closed", fakeReq)).rejects.toMatchObject({ status: 409, code: "TABLE_CLOSED" });
    });

    it("looks a restaurant up by slug once, then answers from the cache", async () => {
        process.env.RESTAURANT_SERVICE_URL = base;
        let calls = 0;
        server.on("request", () => calls++);
        const first = await lookupRestaurant(fakeReq, "mee-keav");
        const second = await lookupRestaurant(fakeReq, "mee-keav");
        expect(second).toEqual(first);
        expect(calls).toBe(1);
    });

    it("answers 503 when the other service is unreachable", async () => {
        await expect(callService("http://127.0.0.1:1", "/ok", fakeReq)).rejects.toMatchObject({ status: 503 });
    });
});

describe("config", () => {
    it("stops with a clear message when a setting is missing or the secret is short", () => {
        expect(() => requireEnv("JWT_SECRET")).not.toThrow();
        expect(() => requireEnv("VMENU_NOT_SET")).toThrow("Missing environment variables: VMENU_NOT_SET");
        const saved = process.env.JWT_SECRET;
        process.env.JWT_SECRET = "short";
        expect(() => requireEnv()).toThrow("JWT_SECRET must be at least 32 characters");
        process.env.JWT_SECRET = saved;
    });
});
