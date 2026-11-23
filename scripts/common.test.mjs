// CL-02: the code every service shares lives once, in backend/packages/common (@vmenu/common),
// and the services import it instead of keeping their own copies.
// Run with `npm run test:repo` (node:test, no dependencies). CI runs it in the `test` gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const at = (...p) => join(root, ...p);
const read = (p) => readFileSync(at(p), "utf8").replace(/\r\n/g, "\n");
const json = (p) => JSON.parse(read(p));

const SERVICES = ["restaurant", "menu", "order"];
const SHARED = ["auth", "config", "errors", "internal", "logger", "metrics", "server", "restaurants"];

test("backend/ is an npm workspace with one lockfile", () => {
  const pkg = json("backend/package.json");
  assert.deepEqual(pkg.workspaces, ["packages/*", "services/*"]);
  assert.ok(existsSync(at("backend/package-lock.json")), "missing backend/package-lock.json");
  for (const s of SERVICES) {
    assert.ok(!existsSync(at(`backend/services/${s}/package-lock.json`)), `backend/services/${s}/package-lock.json is stale: the workspace lockfile replaces it`);
  }
});

test("@vmenu/common holds the shared files once", () => {
  const pkg = json("backend/packages/common/package.json");
  assert.equal(pkg.name, "@vmenu/common");
  for (const f of SHARED) assert.ok(existsSync(at(`backend/packages/common/src/${f}.ts`)), `missing backend/packages/common/src/${f}.ts`);
  const index = read("backend/packages/common/src/index.ts");
  for (const f of SHARED) assert.match(index, new RegExp(`from "\\./${f}\\.js"`), `index.ts does not export ./${f}.js`);
});

test("no service keeps a copy of a shared file", () => {
  for (const s of SERVICES) {
    const lib = at(`backend/services/${s}/src/lib`);
    const left = existsSync(lib) ? readdirSync(lib).map((f) => f.replace(/\.ts$/, "")).filter((f) => SHARED.includes(f)) : [];
    assert.deepEqual(left, [], `backend/services/${s}/src/lib still has ${left.join(", ")}`);
  }
});

test("every service depends on @vmenu/common and imports it", () => {
  for (const s of SERVICES) {
    const pkg = json(`backend/services/${s}/package.json`);
    assert.ok(pkg.dependencies?.["@vmenu/common"], `${s} does not depend on @vmenu/common`);
    assert.match(read(`backend/services/${s}/src/app.ts`), /from "@vmenu\/common"/, `${s}/src/app.ts does not import @vmenu/common`);
  }
});

test("images build from backend/ with each service's Dockerfile", () => {
  const release = read(".github/workflows/release.yml");
  for (const s of SERVICES) {
    assert.match(release, new RegExp(`name: ${s}-service, context: backend, file: backend/services/${s}/Dockerfile`), `release.yml: ${s} must build from backend/`);
    const compose = read("infra/compose/docker-compose.yml");
    assert.match(compose, new RegExp(`context: \\.\\./\\.\\./backend\\n\\s+dockerfile: services/${s}/Dockerfile`), `docker-compose.yml: ${s} must build from backend/`);
    const docker = read(`backend/services/${s}/Dockerfile`);
    assert.match(docker, /COPY packages\/common\//, `${s} Dockerfile does not copy packages/common`);
    assert.match(docker, /^USER node$/m, `${s} Dockerfile must still run as the node user`);
    assert.match(docker, /^HEALTHCHECK /m, `${s} Dockerfile lost its health check`);
  }
  assert.ok(existsSync(at("backend/.dockerignore")), "missing backend/.dockerignore (the build context is backend/ now)");
  assert.match(read("backend/.dockerignore"), /^\*\*\/\.env$/m, "backend/.dockerignore must keep .env files out of images");
});
