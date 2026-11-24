// B7: the post-deploy job signs short-lived staff tokens, so the browser tests never see JWT_SECRET.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const script = join(root, "scripts", "staff-token.mjs");
const SECRET = "test-secret-test-secret-test-secret-01";
const { signStaffToken } = await import("./staff-token.mjs").catch(() => ({}));

const decode = (token) => {
    const [head, payload, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET).update(`${head}.${payload}`).digest("base64url");
    return {
        header: JSON.parse(Buffer.from(head, "base64url")),
        claims: JSON.parse(Buffer.from(payload, "base64url")),
        valid: sig === expected,
    };
};

test("the token script exists", () => {
    assert.ok(existsSync(script));
    assert.equal(typeof signStaffToken, "function");
});

test("signs an HS256 app token for one restaurant, in the shape the services check", () => {
    const { header, claims, valid } = decode(
        signStaffToken("chef", { secret: SECRET, slug: "demo-bistro", resId: "64b000000000000000000001" }),
    );
    assert.ok(valid, "signed with the secret");
    assert.equal(header.alg, "HS256");
    assert.equal(claims.iss, "v-menu");
    assert.equal(claims.role, "chef");
    assert.equal(claims.resSlug, "demo-bistro");
    assert.equal(claims.resId, "64b000000000000000000001");
});

test("signs as the seeded demo owner, who really has the chef and cashier roles there (SEC-03)", () => {
    for (const role of ["chef", "cashier"]) {
        const { claims } = decode(signStaffToken(role, { secret: SECRET }));
        assert.equal(claims.uid, "demo-owner", "the seed gives demo-owner all three roles at demo-bistro");
        assert.equal(claims.email, "owner@demo.local");
    }
});

test("SEED_OWNER_UID and SEED_OWNER_EMAIL pick the owner the seed was run with", () => {
    const out = execFileSync(process.execPath, [script, "cashier"], {
        encoding: "utf8",
        env: { ...process.env, JWT_SECRET: SECRET, SEED_OWNER_UID: "firebase-uid-1", SEED_OWNER_EMAIL: "demo@x.test" },
    });
    assert.deepEqual((({ uid, email }) => ({ uid, email }))(decode(out.trim()).claims), { uid: "firebase-uid-1", email: "demo@x.test" });
});

test("the token lives 10 minutes at most", () => {
    const { claims } = decode(signStaffToken("cashier", { secret: SECRET }));
    assert.ok(claims.exp - claims.iat <= 600, `lives ${claims.exp - claims.iat} s`);
});

test("only signs chef and cashier tokens, never an owner", () => {
    assert.throws(() => signStaffToken("owner", { secret: SECRET }), /chef or cashier/);
});

test("the command prints only the token, and refuses to run without JWT_SECRET", () => {
    const out = execFileSync(process.execPath, [script, "chef"], { encoding: "utf8", env: { ...process.env, JWT_SECRET: SECRET } });
    assert.match(out.trim(), /^[\w-]+\.[\w-]+\.[\w-]+$/);
    assert.ok(decode(out.trim()).valid);
    const { JWT_SECRET: _, ...noSecret } = process.env;
    const r = spawnSync(process.execPath, [script, "chef"], { encoding: "utf8", env: noSecret });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /JWT_SECRET/);
});
