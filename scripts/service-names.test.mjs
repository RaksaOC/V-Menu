// M6: each environment's frontend reaches only its own services.
// Staging and production run on one server and share Docker networks: the reverse proxy's
// ("coolify", PROXY_NETWORK) and MinIO's (STORAGE_NETWORK). Docker gives every container its
// service name ("menu-service") on every network it joins, so on a shared network that name
// pointed at both environments' menu-services, and each frontend reached either one at random.
// The frontend now uses aliases that exist only on its own stack's private "frontend" network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const ALIASES = { restaurant: "vmenu-restaurant-api:4101", menu: "vmenu-menu-api:4102", order: "vmenu-order-api:4103" };

test("the frontend image calls the services by their stack-only aliases", () => {
    const docker = read("frontend/Dockerfile");
    for (const [s, at] of Object.entries(ALIASES)) {
        assert.match(docker, new RegExp(`^ARG ${s.toUpperCase()}_SERVICE_URL=http://${at}$`, "m"), `frontend/Dockerfile: ${s}`);
    }
    const local = read("infra/compose/docker-compose.yml");
    for (const [s, at] of Object.entries(ALIASES)) {
        assert.match(local, new RegExp(`${s.toUpperCase()}_SERVICE_URL: http://${at}`), `docker-compose.yml frontend build: ${s}`);
    }
});

// What remote-deploy.sh runs on the server, with every optional network turned on.
function deployedConfig() {
    const dir = join(root, "infra/deploy");
    const files = [
        "../compose/docker-compose.prod.yml",
        "compose.deploy.yml",
        "compose.mongo-container.yml",
        "compose.proxy-network.yml",
        "compose.storage-network.yml",
    ];
    const env = {
        ...process.env,
        TAG: "sha-test",
        FRONTEND_PORT: "3401",
        MONGO_NETWORK: "vmenu-db-staging",
        PROXY_NETWORK: "coolify",
        STORAGE_NETWORK: "coolify",
    };
    const r = spawnSync(
        "docker",
        [
            "compose",
            "--project-name",
            "vmenu-staging",
            ...files.flatMap((f) => ["-f", f]),
            "config",
            "--format",
            "json",
            "--no-interpolate",
        ],
        { cwd: dir, env, encoding: "utf8" },
    );
    if (r.error || r.status !== 0) return null;
    return JSON.parse(r.stdout);
}

test("on the server, the aliases are only on the stack's own frontend network", (t) => {
    const config = deployedConfig();
    if (!config) return t.skip("docker compose is not available here");
    for (const [s, at] of Object.entries(ALIASES)) {
        const nets = config.services[`${s}-service`].networks;
        const alias = at.split(":")[0];
        assert.deepEqual(nets.frontend?.aliases, [alias], `${s}-service: the "${alias}" alias on the frontend network`);
        for (const [name, net] of Object.entries(nets))
            if (name !== "frontend") assert.ok(!(net?.aliases ?? []).includes(alias), `${s}-service: "${alias}" also on ${name}`);
    }
    // a network with no settings is null in the merged config, so check the key
    assert.ok("storage" in config.services["menu-service"].networks, "menu-service still joins MinIO's network");
    assert.ok("proxy" in config.services.frontend.networks, "the frontend still joins the proxy's network");
});
