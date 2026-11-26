import { expect, test } from "@playwright/test";

// SEC-06: through the real path (Next.js rewrite -> restaurant-service), two clients get two
// rate-limit counters. X-Forwarded-For stands in for what Caddy sets in production. If the
// rewrite ever added its own hop, or the trust-proxy setting were off by one, every client would
// share one counter and this would fail.
const remaining = (header: string | undefined) => Number(/r=(\d+)/.exec(header ?? "")?.[1]);
const random = () => `198.18.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;

test("two clients have separate sign-in rate-limit counters", async ({ request }) => {
    const a = random();
    let b = random();
    while (b === a) b = random();
    const hit = async (ip: string) =>
        // a sign-in request with no ID token: refused (400), but counted. SEC-01: logout isn't limited
        (await request.post("/api/auth/memberships", { headers: { "X-Forwarded-For": ip }, data: {} })).headers()["ratelimit"];

    const first = remaining(await hit(a));
    const second = remaining(await hit(a));
    const third = remaining(await hit(a));
    expect([second, third]).toEqual([first - 1, first - 2]);
    expect(remaining(await hit(b))).toBe(first); // B's counter is untouched by A
});
