// Telegram pipeline messages (infra/notify). Run with `npm run test:repo`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const notify = await import("../infra/notify/telegram.mjs").catch(() => ({}));

const REPO = { full_name: "RaksaOC/V-Menu" };
const TOKEN = "123456:test-token_value";
const run = (overrides = {}) => ({
    name: "Release",
    event: "push",
    status: "completed",
    conclusion: "success",
    head_branch: "staging",
    head_sha: "1a2b3c4d5e6f7a8b",
    display_title: "feat(menu): filter dishes by category (#240)",
    html_url: "https://github.com/RaksaOC/V-Menu/actions/runs/1",
    jobs_url: "https://api.github.com/repos/RaksaOC/V-Menu/actions/runs/1/jobs",
    run_started_at: "2026-11-27T10:00:00Z",
    updated_at: "2026-11-27T10:06:12Z",
    triggering_actor: { login: "RaksaOC" },
    pull_requests: [],
    repository: REPO,
    head_repository: REPO,
    ...overrides,
});
const started = (overrides = {}) => run({ status: "requested", conclusion: null, ...overrides });

/** A fetch that answers with the given responses in order, and records each call. */
function fakeFetch(...responses) {
    const calls = [];
    const impl = async (url, init) => {
        calls.push({ url: String(url), init });
        const { status = 200, body = { ok: true } } = responses[Math.min(calls.length - 1, responses.length - 1)];
        return { ok: status < 400, status, json: async () => body };
    };
    return { impl, calls };
}

function eventFile(name, payload) {
    const dir = mkdtempSync(join(tmpdir(), "notify-"));
    const path = join(dir, "event.json");
    writeFileSync(path, JSON.stringify(payload));
    return { GITHUB_EVENT_NAME: name, GITHUB_EVENT_PATH: path };
}

async function captureLogs(fn) {
    const lines = [];
    const original = console.log;
    console.log = (...args) => lines.push(args.join(" "));
    try {
        return { result: await fn(), output: lines.join("\n") };
    } finally {
        console.log = original;
    }
}

test("the notifier script exists", () => assert.equal(typeof notify.buildMessage, "function"));

test("a deploy that starts is announced; a check that starts is not", () => {
    assert.equal(notify.shouldNotify("requested", started()), true);
    assert.equal(notify.shouldNotify("requested", started({ name: "Rollback", event: "workflow_dispatch" })), true);
    assert.equal(notify.shouldNotify("requested", started({ name: "CI" })), false);
    assert.equal(notify.shouldNotify("requested", started({ name: "Monitoring", event: "pull_request" })), false, "a PR only validates");
});

test("failures always send; cancelled checks, skipped runs and Dependabot's green runs don't", () => {
    const dependabot = { triggering_actor: { login: "dependabot[bot]" } };
    assert.equal(notify.shouldNotify("completed", run({ name: "CI", conclusion: "failure" })), true);
    assert.equal(notify.shouldNotify("completed", run({ name: "CI", conclusion: "cancelled" })), false);
    assert.equal(notify.shouldNotify("completed", run({ conclusion: "cancelled" })), true, "a cancelled release is news");
    assert.equal(notify.shouldNotify("completed", run({ conclusion: "skipped" })), false);
    assert.equal(notify.shouldNotify("completed", run({ name: "CI", ...dependabot })), false);
    assert.equal(notify.shouldNotify("completed", run({ name: "CI", conclusion: "failure", ...dependabot })), true);
});

test("runs from forks never reach the team chat", () => {
    const fork = run({ conclusion: "failure", head_repository: { full_name: "someone/V-Menu" } });
    assert.equal(notify.shouldNotify("completed", fork), false);
});

test("a failed deploy names its environment, the failed jobs and how long it took", () => {
    const jobs = [
        { name: "image (frontend)", conclusion: "success" },
        { name: "deploy / deploy (production)", conclusion: "failure" },
        { name: "deploy / post-deploy checks (staging)", conclusion: "skipped" },
    ];
    const lines = notify.buildMessage("completed", run({ conclusion: "failure", head_branch: "main" }), jobs).split("\n");
    assert.deepEqual(lines, [
        "❌ Release failed · production",
        "feat(menu): filter dishes by category (#240)",
        "Branch main · 1a2b3c4 · RaksaOC",
        "Failed: deploy / deploy (production)",
        "Took 6 min 12 s",
        "https://github.com/RaksaOC/V-Menu/actions/runs/1",
    ]);
});

test("a release that starts says where it is going", () => {
    const text = notify.buildMessage("requested", started());
    assert.match(text, /^🚀 Release started · staging\n/);
    assert.doesNotMatch(text, /Took/);
});

test("a pull request check names the PR, and long titles are cut to one line", () => {
    const pr = run({
        name: "CI",
        event: "pull_request",
        head_branch: "feat/menu-filter",
        pull_requests: [{ number: 240 }],
        display_title: `${"x".repeat(300)}\nsecond line`,
    });
    const lines = notify.buildMessage("completed", pr).split("\n");
    assert.equal(lines[0], "✅ CI succeeded");
    assert.equal(lines[1].length, 160);
    assert.ok(lines[1].endsWith("…"));
    assert.equal(lines[2], "PR #240 (feat/menu-filter) · 1a2b3c4 · RaksaOC");
});

test("a message is plain text to the bot's chat, retried when Telegram asks to slow down", async () => {
    const { impl, calls } = fakeFetch({ status: 429, body: { ok: false, parameters: { retry_after: 2 } } }, { body: { ok: true } });
    const waits = [];
    await notify.send("hello", { token: TOKEN, chatId: "-1001", fetchImpl: impl, wait: async (ms) => waits.push(ms) });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, `https://api.telegram.org/bot${TOKEN}/sendMessage`);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.chat_id, "-1001");
    assert.equal(body.text, "hello");
    assert.equal(body.parse_mode, undefined, "titles come from commits, so no markup is parsed");
    assert.deepEqual(waits, [2000]);
});

test("a malformed token is refused before any request", async () => {
    const { impl, calls } = fakeFetch({ body: { ok: true } });
    await assert.rejects(notify.send("hello", { token: "not a token", chatId: "1", fetchImpl: impl }), /does not look like a bot token/);
    assert.equal(calls.length, 0);
});

test("without the secrets it sends nothing and still succeeds", async () => {
    const { impl, calls } = fakeFetch({ body: { ok: true } });
    const { result } = await captureLogs(() => notify.main(eventFile("workflow_dispatch", {}), impl));
    assert.equal(result, 0);
    assert.equal(calls.length, 0);
});

test("a refused message fails the job without printing the token", async () => {
    const { impl } = fakeFetch({ status: 401, body: { ok: false, description: `Unauthorized for ${TOKEN}` } });
    const env = { ...eventFile("workflow_dispatch", {}), TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: "1" };
    const { result, output } = await captureLogs(() => notify.main(env, impl));
    assert.equal(result, 1);
    assert.match(output, /Telegram refused the message: HTTP 401/);
    assert.ok(!output.includes(TOKEN), "the token must not be printed");
});

test("a completed run reads its jobs with the GitHub token and sends one message", async () => {
    const jobs = { jobs: [{ name: "rollback / deploy (staging)", conclusion: "success" }] };
    const { impl, calls } = fakeFetch({ body: jobs }, { body: { ok: true } });
    const payload = { action: "completed", workflow_run: run({ name: "Rollback", event: "workflow_dispatch" }) };
    const env = { ...eventFile("workflow_run", payload), TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: "1", GH_TOKEN: "gh-token" };
    const { result } = await captureLogs(() => notify.main(env, impl));
    assert.equal(result, 0);
    assert.equal(calls[0].init.headers.Authorization, "Bearer gh-token");
    assert.match(JSON.parse(calls[1].init.body).text, /^✅ Rollback succeeded · staging\n/);
});

test("the workflow listens to every pipeline by its real name and keeps the secrets in one step", () => {
    const wf = read(".github/workflows/notify.yml");
    const names = readdirSync(join(root, ".github/workflows"))
        .filter((f) => f.endsWith(".yml"))
        .map((f) => /^name: (.+)$/m.exec(read(`.github/workflows/${f}`))?.[1]);
    const watched = /workflows: \[([^\]]+)\]/
        .exec(wf)[1]
        .split(",")
        .map((s) => s.trim());
    for (const w of watched) assert.ok(names.includes(w), `notify.yml watches "${w}", but no workflow has that name`);
    for (const p of notify.SERVER_PIPELINES) {
        assert.ok(watched.includes(p), `${p} is a server pipeline but is not watched`);
        assert.match(wf, new RegExp(`"${p}"`), `the job's start filter is missing ${p}`);
    }
    assert.match(wf, /persist-credentials: false/);
    assert.doesNotMatch(wf, /pull_request_target|\bref:/, "it must never run a pull request's code");
    assert.deepEqual([...new Set(wf.match(/secrets\.\w+/g))].sort(), ["secrets.TELEGRAM_BOT_TOKEN", "secrets.TELEGRAM_CHAT_ID"]);
});
