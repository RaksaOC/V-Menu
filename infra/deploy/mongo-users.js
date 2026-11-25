// SEC-11: each V-Menu database user reaches only its own databases. This file holds the one
// definition of who gets what, and the check. It runs in mongosh, and tests load it in Node.
//
// On a server (read-only; it never changes a user, and never prints a password):
//   mongosh "mongodb://127.0.0.1:27017/admin" -u <admin> -p --quiet --file mongo-users.js
//
// If a server's databases have other names than the defaults below, say so:
//   VMENU_STAGING_DBS=a,b,c VMENU_PROD_DBS=d,e,f mongosh ... --file mongo-users.js
//
// VMENU_USERS_MODE=create and =isolation create users and write test documents. They are for the
// throwaway MongoDB in infra/checks/check-db-isolation.sh, and refuse to run without VMENU_THROWAWAY=1
// or on anything but this machine's own address.

const DEFAULT_DBS = {
    staging: ["vmenu_staging_restaurants", "vmenu_staging_menu", "vmenu_staging_orders"],
    prod: ["vmenu_prod_restaurants", "vmenu_prod_menu", "vmenu_prod_orders"],
};

const dbList = (value, fallback) =>
    value
        ? value
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)
        : fallback;

/** { user: [{ role, db }] }: exactly the roles each V-Menu user should have. */
function expectedUsers(env) {
    const staging = dbList(env.VMENU_STAGING_DBS, DEFAULT_DBS.staging);
    const prod = dbList(env.VMENU_PROD_DBS, DEFAULT_DBS.prod);
    const shared = staging.filter((name) => prod.includes(name));
    if (shared.length) throw new Error(`staging and production can't both use: ${shared.join(", ")}`);
    const readWrite = (names) => names.map((db) => ({ role: "readWrite", db }));
    return {
        vmenu_staging: readWrite(staging),
        vmenu_prod: readWrite(prod),
        vmenu_backup: [{ role: "backup", db: "admin" }],
    };
}

const roleName = ({ role, db }) => `${role} on ${db}`;

/** What's wrong, one sentence each. `users` is usersInfo's list: [{ user, db, roles }]. */
function problems(expected, users) {
    const found = [];
    const appDbs = new Set(
        Object.values(expected)
            .flat()
            .map((r) => r.db)
            .filter((db) => db !== "admin"),
    );
    for (const [name, wanted] of Object.entries(expected)) {
        const accounts = users.filter((u) => u.user === name);
        if (!accounts.length) {
            found.push(`${name}: user not found`);
            continue;
        }
        const has = accounts.flatMap((u) => u.roles);
        const same = (a) => (b) => a.role === b.role && a.db === b.db;
        for (const role of has) if (!wanted.some(same(role))) found.push(`${name}: has a role it shouldn't: ${roleName(role)}`);
        for (const role of wanted) if (!has.some(same(role))) found.push(`${name}: missing ${roleName(role)}`);
    }
    for (const user of users) {
        if (user.user in expected) continue;
        for (const role of user.roles)
            if (appDbs.has(role.db)) found.push(`${user.user}: isn't a V-Menu user but has ${roleName(role)}`);
    }
    return found;
}

if (typeof module !== "undefined") module.exports = { expectedUsers, problems };

// ---- only when run by mongosh ----
if (typeof db !== "undefined" && typeof quit === "function") {
    const env = process.env;
    const expected = expectedUsers(env);
    const mode = env.VMENU_USERS_MODE || "check";
    const fail = (message) => {
        print(`FAILED: ${message}`);
        quit(1);
    };

    const throwawayOnly = () => {
        const { hostname } = new URL(db.getMongo().getURI());
        if (env.VMENU_THROWAWAY !== "1" || !["127.0.0.1", "localhost"].includes(hostname))
            fail(`mode "${mode}" is only for the throwaway MongoDB of infra/checks/check-db-isolation.sh`);
        if (!env.VMENU_TEST_PASSWORD) fail("VMENU_TEST_PASSWORD is not set");
    };

    if (mode === "check") {
        const info = db.getSiblingDB("admin").runCommand({ usersInfo: { forAllDBs: true }, showCredentials: false });
        const found = problems(expected, info.users);
        for (const name of Object.keys(expected)) if (!found.some((p) => p.startsWith(`${name}:`))) print(`ok    ${name}`);
        for (const problem of found) print(`WRONG ${problem}`);
        if (found.length) fail(`${found.length} problem(s). See infra/deploy/README.md, "Check the database users".`);
        print("Every V-Menu database user has exactly its own roles.");
    } else if (mode === "create") {
        throwawayOnly();
        const admin = db.getSiblingDB("admin");
        for (const [user, roles] of Object.entries(expected)) admin.createUser({ user, pwd: env.VMENU_TEST_PASSWORD, roles });
        print(`created ${Object.keys(expected).length} users`);
    } else if (mode === "isolation") {
        throwawayOnly();
        const { host } = new URL(db.getMongo().getURI());
        const as = (user) => new Mongo(`mongodb://${user}:${encodeURIComponent(env.VMENU_TEST_PASSWORD)}@${host}/?authSource=admin`);
        const refused = (action) => {
            try {
                action();
                return false;
            } catch (e) {
                if (e.code === 13) return true; // Unauthorized
                throw e;
            }
        };
        const appDbs = { vmenu_staging: expected.vmenu_staging, vmenu_prod: expected.vmenu_prod };
        const wrong = [];
        for (const [user, own] of Object.entries(appDbs)) {
            const conn = as(user);
            for (const { db: name } of own) {
                const col = conn.getDB(name).getCollection("isolation_check");
                col.insertOne({ by: user });
                if (!col.findOne({ by: user })) wrong.push(`${user} can't read its own ${name}`);
                col.deleteMany({ by: user });
            }
            for (const [other, theirs] of Object.entries(appDbs)) {
                if (other === user) continue;
                for (const { db: name } of theirs) {
                    const col = conn.getDB(name).getCollection("isolation_check");
                    if (!refused(() => col.find().toArray())) wrong.push(`${user} can read ${name}`);
                    if (!refused(() => col.insertOne({ by: user }))) wrong.push(`${user} can write to ${name}`);
                }
            }
        }
        const backup = as("vmenu_backup");
        for (const { db: name } of [...appDbs.vmenu_staging, ...appDbs.vmenu_prod])
            if (!refused(() => backup.getDB(name).getCollection("isolation_check").insertOne({ by: "backup" })))
                wrong.push(`vmenu_backup can write to ${name}`);
        for (const line of wrong) print(`WRONG ${line}`);
        if (wrong.length) fail(`${wrong.length} access problem(s)`);
        print("staging and production users can't read or write each other's databases.");
    } else {
        fail(`unknown VMENU_USERS_MODE: ${mode}`);
    }
}
