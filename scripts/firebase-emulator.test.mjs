// B6: e2e sign-ins go to the Firebase Auth emulator in CI, never to a real Firebase project, and
// nothing that builds a real image can turn the emulator on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("compose runs the Auth emulator only under the e2e profile", () => {
    const compose = read("infra/compose/docker-compose.yml");
    const block = compose.slice(compose.indexOf("\n  auth-emulator:"));
    assert.ok(compose.includes("\n  auth-emulator:"), "an auth-emulator service");
    assert.match(block.split(/\n  [a-z-]+:\n/)[0], /profiles: \[e2e\]/);
    assert.match(read("infra/firebase-emulator/firebase.json"), /"auth"/);
});

test("CI points the stack at the emulator, with a demo- project", () => {
    const env = read("scripts/ci-env.sh");
    assert.match(env, /FIREBASE_PROJECT_ID=demo-vmenu/);
    assert.match(env, /NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-vmenu/);
    assert.match(env, /^E2E=1/m);
    assert.match(env, /FIREBASE_AUTH_EMULATOR_HOST=auth-emulator:9099/);
    assert.match(env, /NEXT_PUBLIC_E2E=1/);
    assert.match(read(".github/actions/start-stack/action.yml"), /COMPOSE_PROFILES=e2e/);
});

test("release builds can't turn the emulator on", () => {
    const release = read(".github/workflows/release.yml");
    assert.doesNotMatch(release, /E2E|EMULATOR/);
    for (const f of ["backend/services/restaurant/.env.example", ".env.example"])
        assert.doesNotMatch(read(f), /^\s*(NEXT_PUBLIC_)?E2E=1/m, f);
});
