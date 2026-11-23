import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { baseApp, finish, handleShutdown, markShuttingDown } from "../src/index.js";

// Moved from the three services' tests (CL-02): these run once, here.
const app = baseApp();
app.get("/boom", () => {
    throw new Error("secret detail");
});
app.post("/echo", (req, res) => {
    res.json(req.body);
});
finish(app);

let mongo: MongoMemoryServer;
beforeAll(async () => {
    process.env.SERVICE_NAME = "test-service";
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("common"));
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

describe("base app", () => {
    it("sends security headers and hides the framework", async () => {
        const res = await request(app).get("/health");
        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("gives every request an id, and keeps the caller's", async () => {
        expect((await request(app).get("/health")).headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
        expect((await request(app).get("/health").set("x-request-id", "abc-123")).headers["x-request-id"]).toBe("abc-123");
    });

    it("answers unknown routes with a JSON 404", async () => {
        const res = await request(app).get("/nope");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Route not found" });
    });

    it("hides unexpected errors behind a 500", async () => {
        const res = await request(app).get("/boom");
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: "Something went wrong" });
    });

    it("rejects broken JSON with a 400", async () => {
        const res = await request(app).post("/echo").set("content-type", "application/json").send("{bad");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid JSON body" });
    });

    it("reports the build and exposes Prometheus metrics", async () => {
        expect((await request(app).get("/version")).body).toEqual({ service: "test-service", version: process.env.GIT_SHA ?? "dev" });
        await request(app).get("/nope");
        const metrics = await request(app).get("/metrics");
        expect(metrics.status).toBe(200);
        expect(metrics.text).toContain("http_request_duration_seconds");
    });
});

// Kept last in the file: markShuttingDown() flips module state for the rest of the run.
describe("liveness and readiness", () => {
    it("/health says the process is up; /ready needs the database", async () => {
        const health = await request(app).get("/health");
        expect(health.status).toBe(200);
        expect(health.body.db).toBe(true);
        const ready = await request(app).get("/ready");
        expect(ready.status).toBe(200);
        expect(ready.body.status).toBe("ok");
    });

    it("/ready answers 503 once shutdown starts, /health stays 200", async () => {
        markShuttingDown();
        const ready = await request(app).get("/ready");
        expect(ready.status).toBe(503);
        expect(ready.body.shuttingDown).toBe(true);
        expect((await request(app).get("/health")).status).toBe(200);
    });

    it("SIGTERM drains the server, closes MongoDB and exits 0", async () => {
        const before = { SIGTERM: process.listeners("SIGTERM"), SIGINT: process.listeners("SIGINT") };
        const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        const disconnect = vi.spyOn(mongoose, "disconnect").mockResolvedValue(undefined as never);
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        handleShutdown(server, 2000);
        process.emit("SIGTERM");
        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
        expect(server.listening).toBe(false);
        expect(disconnect).toHaveBeenCalledOnce();

        exit.mockRestore();
        disconnect.mockRestore();
        for (const sig of ["SIGTERM", "SIGINT"] as const) {
            for (const l of process.listeners(sig)) if (!before[sig].includes(l)) process.off(sig, l);
        }
    });
});
