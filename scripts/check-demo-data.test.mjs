// B7: the post-deploy check fails clearly when staging has no demo restaurant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const script = join(root, "scripts", "check-demo-data.mjs");

const MENU = { categories: [{ _id: "c1", name: "Mains", items: [{ _id: "d1", name: "Soup", price: 4 }] }] };

/** A fake site: `routes` maps a path to [status, body]. Anything else is a 404 like the services send. */
async function withSite(routes, fn) {
    const server = createServer((req, res) => {
        const [status, body] = routes[req.url] ?? [404, { message: "Not found" }];
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
        return await fn(`http://127.0.0.1:${server.address().port}`);
    } finally {
        server.closeAllConnections();
        server.close();
    }
}
const check = (url, env = {}) =>
    new Promise((resolve) =>
        execFile(process.execPath, [script, url], { encoding: "utf8", env: { ...process.env, ...env } }, (err, stdout, stderr) =>
            resolve({ status: err ? err.code : 0, out: stdout + stderr }),
        ),
    );

const healthy = {
    "/api/menu/demo-bistro/public/items": [200, MENU],
    "/api/menu/demo-bistro/public/tables/T1": [200, { name: "T1", isActive: true }],
};

test("the check script exists", () => assert.ok(existsSync(script)));

test("passes when the demo restaurant has dishes and its table", async () => {
    const r = await withSite(healthy, check);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /demo-bistro/);
});

test("fails and says how to load the demo data when demo-bistro is missing", async () => {
    const r = await withSite({ "/api/menu/demo-bistro/public/items": [404, { message: "Restaurant not found" }] }, check);
    assert.equal(r.status, 1);
    assert.match(r.out, /demo-bistro/);
    assert.match(r.out, /Restaurant not found/);
    assert.match(r.out, /Load demo data/, "the message names the Deploy workflow option that fixes it");
});

test("fails when the menu has no dishes", async () => {
    const r = await withSite({ ...healthy, "/api/menu/demo-bistro/public/items": [200, { categories: [] }] }, check);
    assert.equal(r.status, 1);
    assert.match(r.out, /no dishes/i);
});

test("fails when the demo table is missing", async () => {
    const r = await withSite({ "/api/menu/demo-bistro/public/items": [200, MENU] }, check);
    assert.equal(r.status, 1);
    assert.match(r.out, /T1/);
});

test("reads the slug and table from SLUG and TABLE", async () => {
    const routes = {
        "/api/menu/other/public/items": [200, [{ _id: "d1", name: "Soup", price: 4 }]], // the older flat list
        "/api/menu/other/public/tables/T9": [200, { name: "T9" }],
    };
    const r = await withSite(routes, (url) => check(url, { SLUG: "other", TABLE: "T9" }));
    assert.equal(r.status, 0, r.out);
});

test("fails when the site can't be reached", async () => {
    const r = await check("http://127.0.0.1:9");
    assert.equal(r.status, 1);
    assert.match(r.out, /could not reach/i);
});
