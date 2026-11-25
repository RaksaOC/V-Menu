// SEC-02: the post-deploy check fails when a page is missing a security header.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const script = join(root, "infra", "checks", "check-headers.mjs");
const GOOD = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy-Report-Only": "default-src 'self'; frame-ancestors 'none'",
};

async function withServer(headers, fn) {
    const server = createServer((_, res) => {
        res.writeHead(200, headers);
        res.end("ok");
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
        return await fn(`http://127.0.0.1:${server.address().port}`);
    } finally {
        server.closeAllConnections(); // fetch keeps connections alive; close() would wait
        server.close();
    }
}
// Async on purpose: a synchronous spawn would block this process, so its test server couldn't answer.
const check = (url) =>
    new Promise((resolve) =>
        execFile(process.execPath, [script, url, "/", "/menu"], { encoding: "utf8" }, (err, stdout, stderr) =>
            resolve({ status: err ? err.code : 0, stdout, stderr }),
        ),
    );

test("the check script exists", () => assert.ok(existsSync(script)));

test("passes when every page has every header", async () => {
    const r = await withServer(GOOD, async (url) => check(url));
    assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("fails and names the header when one is missing", async () => {
    const { "X-Frame-Options": _, ...missing } = GOOD;
    const r = await withServer(missing, async (url) => check(url));
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /x-frame-options/i);
});

test("fails when there is no Content-Security-Policy of either kind", async () => {
    const { "Content-Security-Policy-Report-Only": _, ...missing } = GOOD;
    const r = await withServer(missing, async (url) => check(url));
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /content-security-policy/i);
});

test("the staging post-deploy job runs it", () => {
    assert.match(readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8"), /infra\/checks\/check-headers\.mjs/);
});
