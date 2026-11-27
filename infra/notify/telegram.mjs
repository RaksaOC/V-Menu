#!/usr/bin/env node
// Pipeline messages for the team's Telegram chat, sent by .github/workflows/notify.yml.
//
//   node infra/notify/telegram.mjs
//
// It reads the GitHub event ($GITHUB_EVENT_NAME, $GITHUB_EVENT_PATH) and posts one plain-text
// message to $TELEGRAM_CHAT_ID with the bot in $TELEGRAM_BOT_TOKEN. Without those two secrets it
// sends nothing and exits 0. The token only ever goes to Telegram and is never printed.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Pipelines that change the server: their start is announced as well as their result. */
export const SERVER_PIPELINES = ["Release", "Deploy", "Rollback", "Monitoring"];
/** Checks that a newer push cancels on purpose, so a cancelled run is not news. */
const QUIET_WHEN_CANCELLED = ["CI", "Code scanning", "Deploy test"];

const RESULT = {
    success: { icon: "✅", word: "succeeded" },
    failure: { icon: "❌", word: "failed" },
    timed_out: { icon: "⏱️", word: "timed out" },
    startup_failure: { icon: "❌", word: "could not start" },
    cancelled: { icon: "⏹️", word: "was cancelled" },
    action_required: { icon: "⚠️", word: "is waiting for approval" },
};
const FAILED_JOB = ["failure", "timed_out", "startup_failure"];
const TITLE_LIMIT = 160;

const isBot = (run) => /\[bot\]$/.test(run.triggering_actor?.login ?? run.actor?.login ?? "");
const fromFork = (run) => Boolean(run.head_repository && run.repository && run.head_repository.full_name !== run.repository.full_name);

/** Whether a workflow_run event is worth a message. */
export function shouldNotify(action, run) {
    // Anyone can open a pull request from a fork, so those never reach the team chat.
    if (fromFork(run)) return false;
    if (action === "requested") return SERVER_PIPELINES.includes(run.name) && ["push", "workflow_dispatch"].includes(run.event);
    if (action !== "completed" || !RESULT[run.conclusion]) return false; // skipped, neutral, stale
    if (run.conclusion === "cancelled" && QUIET_WHEN_CANCELLED.includes(run.name)) return false;
    if (run.conclusion === "success" && isBot(run)) return false; // Dependabot's green runs
    return true;
}

/** staging or production, from the deploy job's name ("deploy (staging)") or the branch. */
export function environmentOf(run, jobs = []) {
    for (const job of jobs) {
        const match = /\bdeploy \((staging|production)\)/.exec(job.name ?? "");
        if (match) return match[1];
    }
    if (run.name === "Release") return { main: "production", staging: "staging" }[run.head_branch] ?? "";
    return "";
}

export function duration(from, to) {
    const seconds = Math.round((Date.parse(to) - Date.parse(from)) / 1000);
    if (!Number.isFinite(seconds) || seconds < 0) return "";
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}

const shorten = (text, limit) => {
    const line = String(text ?? "")
        .split("\n")[0]
        .trim();
    return line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
};

/** The message for one workflow_run event. Plain text, so nothing in it is parsed as markup. */
export function buildMessage(action, run, jobs = []) {
    const env = environmentOf(run, jobs);
    const started = action === "requested";
    const { icon, word } = started ? { icon: "🚀", word: "started" } : RESULT[run.conclusion];
    const pr = run.pull_requests?.[0]?.number;
    const where = pr ? `PR #${pr} (${run.head_branch})` : `Branch ${run.head_branch}`;
    const who = run.triggering_actor?.login ?? run.actor?.login;

    const lines = [`${icon} ${run.name} ${word}${env ? ` · ${env}` : ""}`];
    const title = shorten(run.display_title, TITLE_LIMIT);
    if (title && title !== run.name) lines.push(title);
    lines.push([where, run.head_sha?.slice(0, 7), who].filter(Boolean).join(" · "));
    if (!started) {
        const failed = jobs.filter((j) => FAILED_JOB.includes(j.conclusion)).map((j) => j.name);
        if (failed.length)
            lines.push(`Failed: ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? ` and ${failed.length - 6} more` : ""}`);
        const took = duration(run.run_started_at, run.updated_at);
        if (took) lines.push(`Took ${took}`);
    }
    lines.push(run.html_url);
    return lines.join("\n");
}

export function testMessage(env) {
    const link = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
    return [`🔔 V-Menu notifications are working`, `Test sent by ${env.GITHUB_ACTOR} from the Notify workflow.`, link].join("\n");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Posts one message. Waits and retries when Telegram says to slow down. */
export async function send(text, { token, chatId, api = "https://api.telegram.org", fetchImpl = fetch, wait = sleep }) {
    // A malformed token would end up in a URL parse error, so it is checked first.
    if (!/^\d+:[\w-]+$/.test(token)) throw new Error("TELEGRAM_BOT_TOKEN does not look like a bot token (digits, a colon, then letters).");
    const body = JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } });
    for (let attempt = 1; ; attempt++) {
        const res = await fetchImpl(`${api}/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: AbortSignal.timeout(15000),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) return;
        const retryAfter = data.parameters?.retry_after;
        if (res.status === 429 && retryAfter && attempt < 3) {
            await wait(retryAfter * 1000);
            continue;
        }
        throw new Error(`Telegram refused the message: HTTP ${res.status} ${data.description ?? ""}`.trim());
    }
}

/** The run's jobs, for the environment and the failed job names. Empty if they can't be read. */
async function jobsOf(run, env, fetchImpl) {
    const api = env.GITHUB_API_URL ?? "https://api.github.com";
    if (!run.jobs_url?.startsWith(`${api}/`) || !env.GH_TOKEN) return [];
    try {
        const res = await fetchImpl(`${run.jobs_url}?per_page=100`, {
            headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(15000),
        });
        return res.ok ? ((await res.json()).jobs ?? []) : [];
    } catch {
        return [];
    }
}

export async function main(env = process.env, fetchImpl = fetch) {
    const token = env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = env.TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId) {
        console.log("::notice::TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set, so no message was sent.");
        return 0;
    }
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    let text;
    if (env.GITHUB_EVENT_NAME === "workflow_dispatch") {
        text = testMessage(env);
    } else if (env.GITHUB_EVENT_NAME === "workflow_run") {
        const run = event.workflow_run;
        if (!shouldNotify(event.action, run)) {
            console.log(`Nothing to send for ${run.name} ${event.action} (${run.conclusion ?? run.status}).`);
            return 0;
        }
        const jobs = event.action === "completed" ? await jobsOf(run, env, fetchImpl) : [];
        text = buildMessage(event.action, run, jobs);
    } else {
        console.log(`Nothing to send for the ${env.GITHUB_EVENT_NAME} event.`);
        return 0;
    }
    try {
        await send(text, { token, chatId, api: env.TELEGRAM_API_URL, fetchImpl });
        console.log(`Sent:\n${text}`);
        return 0;
    } catch (err) {
        console.log(`::error::${String(err.message).replaceAll(token, "***")}`);
        return 1;
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
