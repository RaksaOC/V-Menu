import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// CL-05: the frontend uses the API types from @vmenu/contracts instead of its own copies.
const read = (f) => readFileSync(f, "utf8");
function* files(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) yield* files(p);
        else if (/\.(ts|tsx)$/.test(p)) yield p;
    }
}

test("the frontend has no API types of its own, and imports them from @vmenu/contracts as types only", () => {
    assert.equal(existsSync("frontend/src/lib/types"), false, "frontend/src/lib/types should be gone");
    const users = [];
    for (const f of files("frontend/src")) {
        for (const line of read(f).split("\n")) {
            if (!line.includes('from "@vmenu/contracts"')) continue;
            users.push(f);
            // `import type` and `export type` are both erased at build time
            assert.match(line, /^(import|export) type /, `${f}: import types only, so no backend code reaches the browser bundle`);
        }
    }
    assert.ok(new Set(users).size >= 10, `only ${new Set(users).size} files use @vmenu/contracts`);
});

test("TypeScript finds @vmenu/contracts (and its zod) from the frontend", () => {
    const paths = JSON.parse(read("frontend/tsconfig.json")).compilerOptions.paths;
    assert.deepEqual(paths["@vmenu/contracts"], ["../backend/packages/contracts/src/index.ts"]);
    assert.deepEqual(paths.zod, ["./node_modules/zod"]);
});

test("the frontend image is built from the repo root, with the contracts' source", () => {
    assert.match(read(".github/workflows/release.yml"), /\{ name: frontend, context: \., file: frontend\/Dockerfile \}/);
    const compose = read("infra/compose/docker-compose.yml");
    assert.match(compose, /frontend:\n\s+build:\n(\s+#.*\n)?\s+context: \.\.\/\.\.\n\s+dockerfile: frontend\/Dockerfile/);
    assert.match(read("frontend/Dockerfile"), /COPY backend\/packages\/contracts\/src /);
    const ignore = read("frontend/Dockerfile.dockerignore");
    assert.match(ignore, /^\*$/m, "send nothing by default");
    assert.match(ignore, /^!frontend$/m);
    assert.match(ignore, /^!backend\/packages\/contracts\/src$/m);
});
