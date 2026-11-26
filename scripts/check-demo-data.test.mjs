// B7: the post-deploy check fails clearly when staging has no demo restaurant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const script = join(root, "infra", "checks", "check-demo-data.mjs");

const MENU = { categories: [{ _id: "c1", name: "Mains", items: [{ _id: "d1", name: "Soup", price: 4 }] }] };

const CASHIER = "cashier.token.sig";
const T1_LINK = "t1-link-token-aaaaaaaaa";

/** A fake site: `routes` maps a path to [status, body]. Anything else is a 404 like the services send.
 *  A route whose path starts with "staff " needs the cashier's cookie, as the real staff API does. */
async function withSite(routes, fn) {
    const server = createServer((req, res) => {
        const staff = routes[`staff ${req.url}`];
        const signedIn = req.headers.cookie === `__Host-vmenu_cashier=${CASHIER}`; // SEC-12: the cashier's own cookie
        const [status, body] = staff
            ? signedIn
                ? staff
                : [401, { message: "Not signed in" }]
            : (routes[req.url] ?? [404, { message: "Not found" }]);
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
        execFile(
            process.execPath,
            [script, url],
            { encoding: "utf8", env: { ...process.env, CASHIER_TOKEN: CASHIER, ...env } },
            (err, stdout, stderr) => resolve({ status: err ? err.code : 0, out: stdout + stderr }),
        ),
    );

// As on the servers: table links by name are off (SEC-04), so T1 opens only by its QR link token.
const healthy = {
    "/api/menu/demo-bistro/public/items": [200, MENU],
    "/api/menu/demo-bistro/public/tables/T1": [400, { message: "This table link is no longer valid" }],
    "staff /api/menu/demo-bistro/tables": [200, [{ _id: "t1", name: "T1", qrToken: T1_LINK, isActive: true }]],
    [`/api/menu/demo-bistro/public/t/${T1_LINK}`]: [200, { name: "T1", isOpen: true }],
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
    const r = await withSite({ ...healthy, "staff /api/menu/demo-bistro/tables": [200, []] }, check);
    assert.equal(r.status, 1);
    assert.match(r.out, /T1/);
});

test("finds T1 by its QR link as the cashier, so it passes with table-name links off (SEC-04, B7)", async () => {
    const r = await withSite(healthy, check);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /T1/);
});

test("fails when T1's QR link doesn't open the table", async () => {
    const r = await withSite(
        { ...healthy, [`/api/menu/demo-bistro/public/t/${T1_LINK}`]: [404, { message: "No such table link" }] },
        check,
    );
    assert.equal(r.status, 1);
    assert.match(r.out, /No such table link/);
});

test("fails clearly without the cashier's token, or with one the site refuses", async () => {
    const none = await withSite(healthy, (url) => check(url, { CASHIER_TOKEN: "" }));
    assert.equal(none.status, 1);
    assert.match(none.out, /CASHIER_TOKEN/);
    const refused = await withSite(healthy, (url) => check(url, { CASHIER_TOKEN: "wrong" }));
    assert.equal(refused.status, 1);
    assert.match(refused.out, /401/);
});

test("reads the slug and table from SLUG and TABLE", async () => {
    const routes = {
        "/api/menu/other/public/items": [200, [{ _id: "d1", name: "Soup", price: 4 }]], // the older flat list
        "staff /api/menu/other/tables": [200, [{ name: "T9", qrToken: "t9-link" }]],
        "/api/menu/other/public/t/t9-link": [200, { name: "T9", isOpen: true }],
    };
    const r = await withSite(routes, (url) => check(url, { SLUG: "other", TABLE: "T9" }));
    assert.equal(r.status, 0, r.out);
});

test("fails when the site can't be reached", async () => {
    const r = await check("http://127.0.0.1:9");
    assert.equal(r.status, 1);
    assert.match(r.out, /could not reach/i);
});
