// The deploy script's --rollback (infra/deploy/remote-deploy.sh), run for real against a stand-in
// `docker`, so it needs no server. A rollback whose target doesn't start must put back the version
// that was running, as a failed normal deploy already does (its auto-rollback). The end-to-end
// version, with real containers, is scenario 10 of .github/workflows/deploy-test.yml.
//
// The script is written for the server (Linux: GNU sed, flock), so this runs on Linux only: in
// CI's repo job, or locally with
//   docker run --rm -v "$PWD:/repo" -w /repo node:22 node --test scripts/deploy-rollback.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const skip = process.platform !== "linux" && "remote-deploy.sh runs on the Linux server (GNU sed, flock)";

// A stand-in for `docker compose`: `up` runs the TAG in .env (or fails for a tag in FAKE_BROKEN),
// and each service's /version answers the tag that is running.
const FAKE_DOCKER = `#!/usr/bin/env bash
args=" $* "
tag=$(grep '^TAG=' .env | tail -n1 | cut -d= -f2-)
case $args in
  *" up "*)
    if [[ " $FAKE_BROKEN " == *" $tag "* ]]; then echo "container menu-service is unhealthy ($tag)" >&2; exit 1; fi
    echo "$tag" > .running ;;
  *"/ready"*) echo '{"status":"ok"}' ;;
  *"/version"*) printf '{"version":"%s"}' "$(cat .running)" ;;
esac
exit 0
`;

function server({ stack, running }) {
    const dir = mkdtempSync(join(tmpdir(), "vmenu-rollback-"));
    const bin = join(dir, "bin");
    const env = join(dir, "staging");
    mkdirSync(bin);
    mkdirSync(env);
    for (const [name, body] of [
        ["docker", FAKE_DOCKER],
        ["curl", "#!/usr/bin/env bash\nexit 0\n"],
        ["flock", "#!/usr/bin/env bash\nexit 0\n"],
    ]) {
        writeFileSync(join(bin, name), body);
        chmodSync(join(bin, name), 0o755);
    }
    writeFileSync(join(env, ".env"), `FRONTEND_PORT=3400\nMONGO_MODE=none\nTAG=${running}\n`);
    writeFileSync(join(env, ".tag_stack"), `${stack.join("\n")}\n`);
    writeFileSync(join(env, ".running"), `${running}\n`);
    const read = (f) => readFileSync(join(env, f), "utf8");
    return {
        rollback: (broken = "") =>
            spawnSync("bash", [join(root, "infra/deploy/remote-deploy.sh"), "staging", "--rollback"], {
                encoding: "utf8",
                env: { PATH: `${bin}:${process.env.PATH}`, VMENU_ROOT: dir, FAKE_BROKEN: broken },
            }),
        running: () => read(".running").trim(),
        tagInEnv: () =>
            /^TAG=(.*)$/m.exec(
                read(".env")
                    .split("\n")
                    .filter((l) => l.startsWith("TAG="))
                    .at(-1) ?? "",
            )?.[1],
        stack: () => read(".tag_stack").trim().split("\n"),
        history: () =>
            read("deploy-history.log")
                .trim()
                .split("\n")
                .map((l) => l.split("\t").slice(1, 4).join(" ")),
        clean: () => rmSync(dir, { recursive: true, force: true }),
    };
}

test("a rollback goes back to the previous version", { skip }, () => {
    const s = server({ stack: ["sha-1111111", "sha-2222222"], running: "sha-2222222" });
    try {
        const r = s.rollback();
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(s.running(), "sha-1111111");
        assert.deepEqual(s.stack(), ["sha-1111111"]);
        assert.deepEqual(s.history(), ["rollback sha-1111111 ok"]);
    } finally {
        s.clean();
    }
});

test("a rollback whose target doesn't start puts back the version that was running", { skip }, () => {
    const s = server({ stack: ["sha-1111111", "sha-2222222"], running: "sha-2222222" });
    try {
        const r = s.rollback("sha-1111111");
        assert.notEqual(r.status, 0, "the rollback itself still fails, so the workflow run is red");
        assert.match(r.stdout + r.stderr, /putting sha-2222222 back/);
        assert.equal(s.running(), "sha-2222222", "the version from before the rollback runs again");
        assert.equal(s.tagInEnv(), "sha-2222222", ".env names the version that runs, so the next restart keeps it");
        assert.deepEqual(s.stack(), ["sha-1111111", "sha-2222222"], "the tag history is unchanged");
        assert.deepEqual(s.history(), ["rollback sha-1111111 failed", "auto-rollback sha-2222222 ok"]);
    } finally {
        s.clean();
    }
});

test("if putting it back fails too, both failures are recorded", { skip }, () => {
    const s = server({ stack: ["sha-1111111", "sha-2222222"], running: "sha-2222222" });
    try {
        const r = s.rollback("sha-1111111 sha-2222222");
        assert.notEqual(r.status, 0);
        assert.match(r.stdout + r.stderr, /could not restore sha-2222222 either/);
        assert.deepEqual(s.history(), ["rollback sha-1111111 failed", "auto-rollback sha-2222222 failed"]);
    } finally {
        s.clean();
    }
});
