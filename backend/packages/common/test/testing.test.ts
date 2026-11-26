import express from "express";
import { describe, expect, it } from "vitest";
import { listRoutes, mismatches, NO_APP_TOKEN, only, PUBLIC, trackRoutes } from "../src/testing.js";

// SEC-07: the helpers behind every service's access matrix.
trackRoutes();

describe("route inventory", () => {
    it("lists every method and full path, through nested routers", () => {
        const app = express();
        const inner = express.Router({ mergeParams: true });
        inner.get("/", (_q, r) => r.end());
        inner.patch("/:id/done", (_q, r) => r.end());
        app.use("/api/orders/:slug/kitchen", inner);
        app.route("/health")
            .get((_q, r) => r.end())
            .head((_q, r) => r.end());
        app.post("/api/orders/:slug", (_q, r) => r.end());
        app.use((_q, _r, next) => next()); // middleware is not a route
        expect(listRoutes(app)).toEqual([
            "GET /api/orders/:slug/kitchen",
            "GET /health",
            "HEAD /health",
            "PATCH /api/orders/:slug/kitchen/:id/done",
            "POST /api/orders/:slug",
        ]);
    });
});

describe("access rules", () => {
    it("only(): the roles of restaurant A; everyone else refused", () => {
        expect(only(["cashier"])).toEqual({
            guest: 401,
            forged: 401,
            chef: 403,
            cashier: "ok",
            owner: 403,
            otherChef: 403,
            otherCashier: 403,
            otherOwner: 403,
        });
        expect(only(["owner"], { ownData: true }).otherOwner).toBe("ok");
        expect(PUBLIC.guest).toBe("ok");
        expect(NO_APP_TOKEN.owner).toBe(401);
    });

    it("mismatches(): 'ok' means anything but 401 and 403", () => {
        const got = { guest: 401, forged: 401, chef: 403, cashier: 404, owner: 403, otherChef: 403, otherCashier: 200, otherOwner: 403 };
        expect(mismatches(only(["cashier"]), got)).toEqual(["otherCashier: expected 403, got 200"]);
    });
});
