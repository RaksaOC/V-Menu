// SEC-11: each database user reaches only its own databases. The pure comparison is tested here;
// scripts/check-db-isolation.sh proves the same against a real MongoDB with users (CI: integration).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const file = join(root, "infra/deploy/mongo-users.js");
const { expectedUsers, problems } = existsSync(file) ? createRequire(import.meta.url)(file) : {};

const STAGING = ["vmenu_staging_restaurants", "vmenu_staging_menu", "vmenu_staging_orders"];
const PROD = ["vmenu_prod_restaurants", "vmenu_prod_menu", "vmenu_prod_orders"];
const rw = (dbs) => dbs.map((db) => ({ role: "readWrite", db }));
const good = () => [
    { user: "vmenu_staging", db: "admin", roles: rw(STAGING) },
    { user: "vmenu_prod", db: "admin", roles: rw(PROD) },
    { user: "vmenu_backup", db: "admin", roles: [{ role: "backup", db: "admin" }] },
    { user: "admin", db: "admin", roles: [{ role: "root", db: "admin" }] },
];
const check = (users, env = {}) => problems(expectedUsers(env), users);
const change = (name, roles) => good().map((u) => (u.user === name ? { ...u, roles } : u));

test("the shared definition exists", () => {
    assert.ok(existsSync(file), "infra/deploy/mongo-users.js");
    assert.equal(typeof expectedUsers, "function");
    assert.equal(typeof problems, "function");
});

test("the documented users and roles pass", () => assert.deepEqual(check(good()), []));

test("the order of a user's roles doesn't matter", () => {
    assert.deepEqual(check(change("vmenu_prod", rw([...PROD].reverse()))), []);
});

test("a staging user with a role on a production database fails, and the other way round", () => {
    const a = check(change("vmenu_staging", [...rw(STAGING), { role: "read", db: "vmenu_prod_orders" }]));
    assert.equal(a.length, 1);
    assert.match(a[0], /vmenu_staging.*read.*vmenu_prod_orders/);
    const b = check(change("vmenu_prod", [...rw(PROD), { role: "readWrite", db: "vmenu_staging_menu" }]));
    assert.match(b[0], /vmenu_prod.*readWrite.*vmenu_staging_menu/);
});

for (const role of ["readAnyDatabase", "readWriteAnyDatabase", "root", "dbAdminAnyDatabase"]) {
    test(`an app user with ${role} fails`, () => {
        const found = check(change("vmenu_staging", [...rw(STAGING), { role, db: "admin" }]));
        assert.equal(found.length, 1);
        assert.match(found[0], new RegExp(role));
    });
}

test("a missing user or a missing role fails", () => {
    assert.match(check(good().filter((u) => u.user !== "vmenu_prod"))[0], /vmenu_prod.*not found/);
    assert.match(check(change("vmenu_staging", rw(STAGING.slice(1))))[0], /vmenu_staging.*missing.*vmenu_staging_restaurants/);
});

test("the backup user has backup only", () => {
    assert.match(check(change("vmenu_backup", [{ role: "root", db: "admin" }]))[0], /vmenu_backup/);
});

test("another user with a role on an app database fails; an admin account doesn't", () => {
    const users = [...good(), { user: "someone", db: "admin", roles: [{ role: "read", db: "vmenu_prod_orders" }] }];
    assert.match(check(users)[0], /someone.*vmenu_prod_orders/);
});

test("a user defined in another database is still checked", () => {
    const users = good().map((u) => (u.user === "vmenu_prod" ? { ...u, db: "vmenu_prod_orders" } : u));
    assert.deepEqual(check(users), []);
    const twice = [...good(), { user: "vmenu_prod", db: "other", roles: [{ role: "read", db: "vmenu_staging_menu" }] }];
    assert.match(check(twice)[0], /vmenu_prod.*vmenu_staging_menu/);
});

test("the database names can be given, for a server that uses other names", () => {
    const names = ["app_a", "app_b", "app_c"];
    const users = change("vmenu_prod", rw(names));
    assert.deepEqual(check(users, { VMENU_PROD_DBS: names.join(",") }), []);
    assert.equal(check(users).length > 0, true);
});

test("the two environments can't be given the same database", () => {
    assert.throws(() => expectedUsers({ VMENU_PROD_DBS: "vmenu_staging_menu" }), /both/);
});

test("the setup README creates exactly the users the check expects", () => {
    const readme = read("infra/deploy/README.md");
    const expected = expectedUsers({});
    for (const [user, roles] of Object.entries(expected)) {
        const block = new RegExp(`db\\.createUser\\(\\{ user: "${user}"[\\s\\S]*?\\}\\)`).exec(readme)?.[0];
        assert.ok(block, `README creates ${user}`);
        for (const { role, db } of roles) {
            if (db === "admin") assert.ok(block.includes(`"${role}"`), `${user}: ${role}`);
            else assert.ok(block.includes(`{ role: "${role}", db: "${db}" }`), `${user}: ${role} on ${db}`);
        }
    }
});

test("the integration job runs the check against a real MongoDB", () => {
    const ci = read(".github/workflows/ci.yml");
    const integration = ci.slice(ci.indexOf("\n  integration:\n"), ci.indexOf("\n  e2e:\n"));
    assert.match(integration, /bash scripts\/check-db-isolation\.sh/);
    assert.ok(existsSync(join(root, "scripts/check-db-isolation.sh")));
});

test("the real-database script only works on a throwaway container and proves it can fail", () => {
    const sh = read("scripts/check-db-isolation.sh");
    assert.match(sh, /docker run/);
    assert.match(sh, /--auth/);
    assert.doesNotMatch(sh, /-p \d+:27017|--publish/, "the throwaway MongoDB isn't published on a port");
    assert.match(sh, /trap /, "it always removes its container");
    assert.match(sh, /grantRolesToUser/, "it also checks that an over-broad user is caught");
    const js = read("infra/deploy/mongo-users.js");
    assert.match(js, /VMENU_THROWAWAY/, "creating users and test writes need the throwaway flag");
});

test("the check never prints passwords or credentials", () => {
    const js = read("infra/deploy/mongo-users.js");
    assert.doesNotMatch(js, /showCredentials:\s*true/);
    assert.match(js, /showCredentials:\s*false/);
});
