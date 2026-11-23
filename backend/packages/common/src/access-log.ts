import type { NextFunction, Request, Response } from "express";
import client from "prom-client";
import { logger } from "./logger.js";
import { registry } from "./metrics.js";

// SEC-10: every refused request (401, 403, 429) is counted by reason and logged, so a burst of
// failed access shows up on the dashboard and fires an alert. The reason is for us only: answers
// to the caller don't change. Logs never contain a token, a key, a query string or a full email.
export const ACCESS_FAILURES = [
    "no_token",
    "bad_token",
    "expired",
    "wrong_role",
    "other_restaurant",
    "rate_limited",
    "cross_site",
    "other",
] as const;
export type AccessFailure = (typeof ACCESS_FAILURES)[number];

/** Who was refused, when we know it: only from a token or Firebase sign-in that was verified. */
export interface Caller {
    role?: string;
    email?: string;
    /** the restaurant on their token, or the one they tried to sign in to */
    resId?: string;
}

const serviceName = () => process.env.SERVICE_NAME ?? "service";

const failures = new client.Counter({
    name: "vmenu_auth_failures_total",
    help: "Requests refused with 401, 403 or 429, by service and reason",
    labelNames: ["service", "reason"],
    registers: [registry],
});
// Every reason starts at 0: Prometheus' increase() can't see a series' first value.
for (const reason of ACCESS_FAILURES) failures.inc({ service: serviceName(), reason }, 0);

/** s***@gmail.com. Anything that doesn't look like an email is hidden completely. */
export function maskEmail(email: string | undefined): string | undefined {
    if (email === undefined) return undefined;
    const at = email.indexOf("@");
    return at > 0 ? `${email[0]}***${email.slice(at)}` : "***";
}

// From the path only: the query string could hold anything. Ids and slugs are replaced, as in the
// request metrics, and the length is capped because the path is whatever the caller sent.
const RESTAURANT_PATH = /^(\/api\/(?:menu|orders|restaurants))\/(?!owner(?:\/|$))([^/]+)/;
function where(req: Request) {
    const path = (req.originalUrl ?? req.url).split("?")[0];
    return {
        route: path
            .replace(RESTAURANT_PATH, "$1/:slug")
            .replace(/\/[0-9a-f]{24}(?=\/|$)/g, "/:id")
            .slice(0, 120),
        restaurant: RESTAURANT_PATH.exec(path)?.[2]?.slice(0, 64),
    };
}

export function recordAccessFailure(req: Request, status: number, reason: AccessFailure, caller?: Caller) {
    failures.inc({ service: serviceName(), reason });
    (req.log ?? logger).warn(
        {
            status,
            reason,
            method: req.method,
            ...where(req),
            role: caller?.role,
            callerRestaurant: caller?.resId,
            email: maskEmail(caller?.email),
        },
        "access refused",
    );
}

/** For express-rate-limit's `handler`: records the refusal and sends the limiter's usual answer. */
export function rateLimitHandler(req: Request, res: Response, _next: NextFunction, options: { statusCode: number; message: unknown }) {
    recordAccessFailure(req, options.statusCode, "rate_limited");
    res.status(options.statusCode).send(options.message);
}
