import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import { promisify } from "node:util";
import { parseRateLimit } from "../infra/checks/check-rate-limit.mjs";

const run = promisify(execFile);

test("parses the RateLimit header (draft-8)", () => {
    assert.deepEqual(parseRateLimit('"30-in-1min"; r=27; t=60'), { limit: 30, remaining: 27, resetSeconds: 60 });
    assert.equal(parseRateLimit(undefined), null);
    assert.equal(parseRateLimit("nonsense"), null);
});

test("prints what is left for this network", async () => {
    const server = createServer((req, res) => {
        res.setHeader("RateLimit", '"30-in-1min"; r=29; t=60');
        res.end("{}");
    });
    await new Promise((ok) => server.listen(0, ok));
    try {
        const { stdout } = await run(process.execPath, ["infra/checks/check-rate-limit.mjs", `http://127.0.0.1:${server.address().port}`]);
        assert.match(stdout, /29 of 30 sign-in attempts left/);
    } finally {
        server.closeAllConnections();
        server.close();
    }
});
