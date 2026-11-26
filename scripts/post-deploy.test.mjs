// B7: after every staging deploy, one job tests staging (demo data, security headers, a short
// browser suite, the ZAP baseline). If it fails, the run fails and the "Deploy failed" alert fires.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

/** The text of one job in a workflow: from "  <id>:" to the next job (two-space indent). */
function job(workflow, id) {
    const jobs = workflow.slice(workflow.indexOf("\njobs:\n"));
    const start = jobs.indexOf(`\n  ${id}:\n`);
    if (start < 0) return "";
    const rest = jobs.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[\w-]+:\n/);
    return next < 0 ? rest : rest.slice(0, next + 1);
}
/** The text of one step, found by its name. */
function step(jobText, name) {
    const start = jobText.indexOf(`- name: ${name}`);
    if (start < 0) return "";
    const rest = jobText.slice(start);
    const next = rest.slice(1).search(/\n\s+- (name|uses):/);
    return next < 0 ? rest : rest.slice(0, next + 1);
}

const deploy = read(".github/workflows/deploy.yml");
const post = job(deploy, "post-deploy");

test("a post-deploy job runs after a staging deploy, never after a rollback or for production", () => {
    assert.ok(post, "deploy.yml needs a post-deploy job");
    assert.match(post, /needs: deploy/);
    assert.match(post, /if: .*needs\.deploy\.outputs\.environment == 'staging'/);
    assert.match(post, /if: .*!inputs\.rollback/);
    assert.match(post, /if: .*needs\.deploy\.outputs\.url != ''/, "skips when no server is configured yet");
});

test("it absorbs the ZAP job (SEC-09) and the header check (SEC-02)", () => {
    assert.equal(job(deploy, "zap"), "", "the separate zap job is folded into post-deploy");
    assert.match(post, /node infra\/checks\/check-headers\.mjs "\$TARGET"/);
    assert.match(post, /zap-baseline\.py/);
    assert.match(post, /security-summary\.mjs zap .*--fail-on-high/);
    assert.match(post, /upload-artifact/);
});

test("it checks the demo restaurant first, and runs the short browser suite", () => {
    assert.match(post, /node infra\/checks\/check-demo-data\.mjs "\$TARGET"/);
    assert.match(post, /playwright test --grep @post-deploy/);
    assert.match(post, /BASE_URL: \$\{\{ needs\.deploy\.outputs\.url \}\}/);
    // Every check runs even when an earlier one failed, so one run shows everything that's wrong.
    for (const name of ["Security headers", "Browser tests", "Scan"]) assert.match(step(post, name), /if: .*!cancelled\(\)/, name);
});

test("JWT_SECRET only reaches the step that signs the short-lived staff tokens", () => {
    const sign = step(post, "Staff tokens");
    assert.ok(sign, "a 'Staff tokens' step");
    assert.match(sign, /JWT_SECRET: \$\{\{ secrets\.JWT_SECRET \}\}/);
    assert.match(sign, /::add-mask::/);
    assert.match(sign, /for role in chef cashier/);
    assert.match(sign, /node infra\/checks\/staff-token\.mjs "\$role"/);
    const others = post.replace(sign, "");
    assert.doesNotMatch(others, /secrets\.JWT_SECRET/);
    assert.doesNotMatch(others, /secrets\.(SSH_|MONGODB_)/, "the browser tests run without server secrets");
});

test("a failed post-deploy check is recorded on the server, so the Deploy failed alert fires", () => {
    const failed = job(deploy, "post-deploy-failed");
    assert.ok(failed, "deploy.yml needs a post-deploy-failed job");
    assert.match(failed, /needs: \[deploy, post-deploy\]/);
    assert.match(failed, /needs\.post-deploy\.result == 'failure'/);
    assert.match(failed, /DEPLOY_ACTION: --check-failed/);
    assert.match(failed, /bash infra\/deploy\/ci-deploy\.sh/);

    assert.match(read("infra/deploy/ci-deploy.sh"), /--check-failed/);
    const remote = read("infra/deploy/remote-deploy.sh");
    assert.match(remote, /--check-failed\)/);
    assert.match(remote, /record post-deploy-check "\$\(current_tag\)" failed/);
    // The Deploy failed alert counts every failed line, whatever the action.
    const alerts = JSON.parse(read("infra/monitoring/alerts/vmenu-alerts.json"));
    const rule = alerts.rules.find((r) => r.uid === "vmenu-deploy-failed");
    assert.match(rule.data[0].model.expr, /result="failed"/);
    assert.doesNotMatch(rule.data[0].model.expr, /action=/);
    assert.match(rule.annotations.description, /post-deploy/);
});

test("the deploy test on a throwaway runner covers the new action", () => {
    assert.match(read(".github/workflows/deploy-test.yml"), /deploy staging --check-failed/);
});

test("the staff tokens come first: the demo-data check reads T1's QR link as the cashier (SEC-04)", () => {
    assert.ok(post.indexOf("- name: Staff tokens") < post.indexOf("- name: Demo data"), "tokens before the demo-data check");
    assert.doesNotMatch(step(post, "Staff tokens"), /if: steps\.demo/, "the tokens don't wait for the check that needs them");
});

test("the browser suite opens the demo table by its QR link, not its name (off on the servers since SEC-04)", () => {
    const spec = read("e2e/tests/post-deploy.spec.ts");
    assert.match(spec, /\/t\/\$\{/, "opens /<slug>/t/<token>");
    assert.match(spec, /qrToken/);
    assert.doesNotMatch(spec, /\/customer\/\$\{TABLE\}/);
});

test("CI runs the post-deploy checks with table-name links off, as on the servers (B7)", () => {
    const e2e = job(read(".github/workflows/ci.yml"), "e2e");
    const off = step(e2e, "Post-deploy checks, table-name links off");
    assert.ok(off, "an e2e step named 'Post-deploy checks, table-name links off'");
    assert.match(off, /ALLOW_TABLE_NAME_LINKS=false/);
    assert.match(off, /docker compose up -d --no-build --wait/);
    assert.match(off, /node infra\/checks\/staff-token\.mjs/);
    assert.match(off, /node infra\/checks\/check-demo-data\.mjs/);
    assert.match(off, /playwright test --grep @post-deploy/);
});

test("the browser suite is a tagged e2e spec, so the e2e job runs it on every PR too", () => {
    const spec = read("e2e/tests/post-deploy.spec.ts");
    assert.match(spec, /tag: "@post-deploy"/);
    assert.match(spec, /\/kitchen/, "the kitchen API sees the order");
    assert.match(spec, /\/cancel/, "the test order is cancelled, so staging's queue stays clean");
    assert.match(spec, /CHEF_TOKEN/);
    assert.doesNotMatch(spec, /JWT_SECRET/, "on staging it only gets the short-lived tokens");
});

test("recording a failed check only adds a history line: it copies no files and needs no database or app secrets", () => {
    // The file copy replaces the server's .env, which holds the running TAG. This job isn't in the
    // deploy queue, so doing that here could pull the TAG out from under a deploy in progress.
    const dir = mkdtempSync(join(tmpdir(), "vmenu-b7-"));
    try {
        const calls = join(dir, "ssh-calls");
        writeFileSync(join(dir, "ssh"), `#!/usr/bin/env bash\necho "\${@: -1}" >> "${calls}"\ncat > /dev/null\n`);
        chmodSync(join(dir, "ssh"), 0o755);
        const r = spawnSync("bash", [join(root, "infra/deploy/ci-deploy.sh")], {
            encoding: "utf8",
            cwd: root,
            env: {
                PATH: `${dir}:${process.env.PATH}`,
                TARGET: "staging",
                DEPLOY_ACTION: "--check-failed",
                SSH_HOST: "server.invalid",
                SSH_USER: "deploy",
                SSH_KEY: "not-a-real-key",
                SSH_KNOWN_HOSTS: "server.invalid ssh-ed25519 AAAA",
            },
        });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        const remote = readFileSync(calls, "utf8").trim().split("\n");
        assert.equal(remote.length, 1, `one ssh call, got: ${remote.join(" | ")}`);
        assert.match(remote[0], /remote-deploy\.sh' 'staging' '--check-failed'/);
        assert.doesNotMatch(remote[0], /tar /);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("the job that records the failure only gets the SSH secrets", () => {
    const failed = job(deploy, "post-deploy-failed");
    assert.match(failed, /secrets\.SSH_KEY/);
    assert.doesNotMatch(failed, /secrets\.(MONGODB|JWT|INTERNAL)/);
});
