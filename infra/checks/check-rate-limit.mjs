#!/usr/bin/env node
// SEC-06: check, on a real deployment, that two clients get two rate-limit counters.
//
//   node infra/checks/check-rate-limit.mjs https://<staging host>
//
// It makes one harmless request (POST /api/auth/logout) and prints how many sign-in attempts this
// network has left this minute. Run it 3 times from one network (Wi-Fi), then once from another
// (a phone on mobile data). The other network should show the full limit minus one; if it shows
// the count continuing from the first network, every visitor shares one counter.
import { pathToFileURL } from "node:url";

/** "30-in-1min"; r=27; t=60  ->  { limit: 30, remaining: 27, resetSeconds: 60 } */
export function parseRateLimit(header) {
    const limit = /"?(\d+)-in-/.exec(header ?? "")?.[1];
    const remaining = /\br=(\d+)/.exec(header ?? "")?.[1];
    const reset = /\bt=(\d+)/.exec(header ?? "")?.[1];
    if (remaining === undefined) return null;
    return { limit: limit ? Number(limit) : null, remaining: Number(remaining), resetSeconds: reset ? Number(reset) : null };
}

async function main([base]) {
    if (!base) {
        console.error("usage: node infra/checks/check-rate-limit.mjs <base url>");
        return 2;
    }
    const res = await fetch(new URL("/api/auth/logout", base), { method: "POST" });
    const parsed = parseRateLimit(res.headers.get("ratelimit"));
    if (!parsed) {
        console.error(`No RateLimit header from ${base} (status ${res.status}).`);
        return 1;
    }
    console.log(
        `${parsed.remaining} of ${parsed.limit ?? "?"} sign-in attempts left for this network (resets in ${parsed.resetSeconds ?? "?"} s)`,
    );
    return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main(process.argv.slice(2));
