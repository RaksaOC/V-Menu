// CL-01: the repo is grouped into frontend/, backend/ and infra/, and every path that CI,
// Docker, Dependabot, CODEOWNERS and the root scripts point at really exists.
// Run with `npm run test:repo` (node:test, no dependencies). CI runs it in the `test` gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const at = (...p) => join(root, ...p);
const read = (p) => readFileSync(at(p), "utf8").replace(/\r\n/g, "\n");
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

const SERVICES = ["restaurant", "menu", "order"];

test("the repo uses the frontend / backend / infra layout", () => {
    const dirs = [
        "frontend",
        "e2e",
        "scripts",
        "backend",
        ...SERVICES.map((s) => `backend/services/${s}`),
        "infra/deploy",
        "infra/monitoring",
        "infra/compose",
    ];
    for (const d of dirs) assert.ok(isDir(at(d)), `missing folder ${d}/`);
    for (const s of SERVICES) {
        // No per-service package-lock.json: since CL-02 backend/package-lock.json covers them all.
        for (const f of ["package.json", "Dockerfile", ".env.example"]) {
            assert.ok(existsSync(at("backend/services", s, f)), `missing backend/services/${s}/${f}`);
        }
    }
    for (const f of ["docker-compose.yml", "docker-compose.prod.yml"]) {
        assert.ok(existsSync(at("infra/compose", f)), `missing infra/compose/${f}`);
    }
    // The old places are gone, so nothing can keep using them by accident.
    for (const old of ["services", "deploy", "monitoring", "docker-compose.yml", "docker-compose.prod.yml"]) {
        assert.ok(!existsSync(at(old)), `${old} should have moved`);
    }
});

test("CI test and audit jobs point at real packages", () => {
    const ci = read(".github/workflows/ci.yml");
    const dirs = [...ci.matchAll(/\bdir: ([\w./-]+)/g)].map((m) => m[1]);
    assert.ok(dirs.length >= 9, `expected the test and audit matrix dirs, found ${dirs.length}`);
    for (const d of dirs) {
        if (d === ".") continue;
        assert.ok(existsSync(at(d, "package.json")), `ci.yml dir ${d} has no package.json`);
    }
    // The audit check names are required by the staging ruleset: keep them stable.
    for (const s of SERVICES) {
        assert.match(ci, new RegExp(`name: services/${s}-service, dir: backend/services/${s}\\b`));
    }
});

test("release builds the four images from real folders, with the same names", () => {
    const rel = read(".github/workflows/release.yml");
    // `file:` is optional: the services build from backend/ with their own Dockerfile (CL-02).
    const rows = [...rel.matchAll(/- \{ name: ([\w-]+), context: ([\w./-]+)(?:, file: ([\w./-]+))? \}/g)];
    assert.deepEqual(rows.map((m) => m[1]).sort(), ["frontend", "menu-service", "order-service", "restaurant-service"]);
    for (const [, name, context, file] of rows) {
        assert.ok(isDir(at(context)), `image ${name}: context ${context} does not exist`);
        const dockerfile = file ?? join(context, "Dockerfile");
        assert.ok(existsSync(at(dockerfile)), `image ${name}: no Dockerfile at ${dockerfile}`);
    }
    assert.match(rel, /IMAGE: ghcr\.io\/\$\{\{ needs\.meta\.outputs\.owner \}\}\/vmenu-\$\{\{ matrix\.name \}\}/);
});

test("the local compose file builds from real folders", () => {
    const file = "infra/compose/docker-compose.yml";
    const compose = read(file);
    const base = dirname(at(file));
    // `dockerfile:` (relative to the context) is optional: the services build from backend/.
    const builds = [...compose.matchAll(/^ {6}context: ([\w./-]+)\n(?: {6}dockerfile: ([\w./-]+)\n)?/gm)];
    assert.equal(builds.length, 4, "expected 4 build contexts");
    for (const [, c, df] of builds) {
        assert.ok(existsSync(join(resolve(base, c), df ?? "Dockerfile")), `${file}: no ${df ?? "Dockerfile"} in ${c}`);
    }
    for (const [, envFile] of compose.matchAll(/^ {4}env_file: ([\w./-]+)$/gm)) {
        // .env files are not committed; their .env.example sits next to them.
        assert.ok(existsSync(resolve(base, envFile) + ".example"), `${file}: no ${envFile}.example`);
    }
    // Service names (and so container names and image names) stay as they were.
    for (const s of SERVICES) assert.match(compose, new RegExp(`^  ${s}-service:$`, "m"));
});

test("the production compose file keeps the server's env file layout", () => {
    const prod = read("infra/compose/docker-compose.prod.yml");
    for (const s of SERVICES) {
        assert.match(prod, new RegExp(`image: ghcr\\.io/raksaoc/vmenu-${s}-service:`));
        // Relative to /srv/vmenu/<env>/ on the server, which ci-deploy.sh writes.
        assert.match(prod, new RegExp(`env_file: \\./services/${s}-service/\\.env`));
    }
    const deploy = read("infra/deploy/ci-deploy.sh");
    assert.match(deploy, /\$here\/\.\.\/compose\/docker-compose\.prod\.yml/);
});

test("Dependabot watches real folders", () => {
    const dep = read(".github/dependabot.yml");
    const dirs = [...dep.matchAll(/^ {6}- (\/[\w./-]*)$/gm)].map((m) => m[1]);
    assert.ok(dirs.length >= 10, `expected the Dependabot directories, found ${dirs.length}`);
    for (const d of dirs) assert.ok(isDir(at(d)), `dependabot.yml: ${d} does not exist`);
});

test("CODEOWNERS paths exist", () => {
    const lines = read(".github/CODEOWNERS")
        .split("\n")
        .filter((l) => l.startsWith("/"));
    for (const l of lines) {
        const p = l.split(/\s+/)[0];
        if (p.includes("*")) {
            assert.ok(isDir(at(dirname(p))), `CODEOWNERS: ${p} has no folder`);
        } else {
            assert.ok(existsSync(at(p)), `CODEOWNERS: ${p} does not exist`);
        }
    }
});

test("path filters in workflows point at real files", () => {
    for (const wf of ["deploy-test.yml", "monitoring.yml"]) {
        const text = read(`.github/workflows/${wf}`);
        for (const [, p] of text.matchAll(/^ {6}- "([^"]+)"$/gm)) {
            const fixed = p.replace(/\/\*\*$/, "");
            assert.ok(existsSync(at(fixed)), `${wf}: path filter ${p} matches nothing`);
        }
    }
});

test("root scripts and helper scripts use the new paths", () => {
    const pkg = JSON.parse(read("package.json"));
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
        for (const [, d] of cmd.matchAll(/--prefix ([\w./-]+)/g)) {
            assert.ok(existsSync(at(d, "package.json")), `npm script ${name}: --prefix ${d} has no package.json`);
        }
        for (const [, f] of cmd.matchAll(/-f ([\w./-]+\.ya?ml)/g)) {
            assert.ok(existsSync(at(f)), `npm script ${name}: compose file ${f} does not exist`);
        }
    }
    const stale = /(^|[\s"'`(])(\.\/)?(services\/[a-z]+-service|deploy\/|monitoring\/|docker-compose(\.prod)?\.yml)/m;
    for (const f of [
        "package.json",
        "scripts/setup.mjs",
        "scripts/ci-env.sh",
        "scripts/dev-db.mjs",
        "scripts/smoke.mjs",
        "scripts/place-order.mjs",
    ]) {
        const m = read(f).match(stale);
        assert.equal(m, null, `${f} still uses the old path ${m?.[0]?.trim()}`);
    }
});

test("the CI stack action builds and runs infra/compose/docker-compose.yml", () => {
    const action = read(".github/actions/start-stack/action.yml");
    // Bake runs from its local source folder, so `files: docker-compose.yml` is that file.
    assert.match(action, /^ {8}source: infra\/compose$/m);
    assert.match(action, /^ {8}files: docker-compose\.yml$/m);
    // ...and every later `docker compose` call in the job uses the same file.
    assert.match(action, /COMPOSE_FILE=\$GITHUB_WORKSPACE\/infra\/compose\/docker-compose\.yml/);
    assert.doesNotMatch(action, /services\/[a-z]+-service/);
});

// The before/after screenshots (B11) are kept outside the repo: 800+ images made every clone heavy,
// and nothing builds, tests or deploys from them. PR screenshots are attached to the PR instead.
test("the repo holds no screenshot showcase", () => {
    assert.ok(!existsSync(join(root, "docs")), "docs/ is gone; keep screenshots outside the repo");
    assert.doesNotMatch(read(".github/pull_request_template.md"), /docs\/showcase/, "the PR template still asks for docs/showcase");
});
