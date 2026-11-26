import request from "supertest";
import { describe, expect, it } from "vitest";
import { baseApp, finish } from "../src/index.js";

// SEC-06: the request path is browser -> Caddy -> Next.js rewrite -> service. Caddy sets
// X-Forwarded-For to the client's address; the Next.js rewrite passes it on without adding a hop.
// So the service trusts exactly one hop: its direct peer, and takes the client from the header.
function echoIp() {
    const app = baseApp();
    app.get("/ip", (req, res) => {
        res.json({ ip: req.ip, ips: req.ips });
    });
    return finish(app);
}

describe("client address behind the proxy (SEC-06)", () => {
    const app = echoIp();

    it("is the address Caddy forwarded", async () => {
        const res = await request(app).get("/ip").set("X-Forwarded-For", "203.0.113.7");
        expect(res.body.ip).toBe("203.0.113.7");
    });

    it("two clients are two addresses (so two rate-limit counters)", async () => {
        const a = await request(app).get("/ip").set("X-Forwarded-For", "203.0.113.7");
        const b = await request(app).get("/ip").set("X-Forwarded-For", "198.51.100.9");
        expect(a.body.ip).not.toBe(b.body.ip);
    });

    it("ignores addresses a client wrote into the header itself", async () => {
        // a proxy that appends gives "<what the client sent>, <real client>": only the last one counts
        const res = await request(app).get("/ip").set("X-Forwarded-For", "10.0.0.1, 1.2.3.4, 203.0.113.7");
        expect(res.body.ip).toBe("203.0.113.7");
    });

    it("without the header, it is the direct peer", async () => {
        const res = await request(app).get("/ip");
        expect(res.body.ip).toMatch(/127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/);
    });
});
