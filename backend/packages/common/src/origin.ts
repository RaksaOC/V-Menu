import type { NextFunction, Request, Response } from "express";
import { forbidden } from "./errors.js";

// SEC-01: CSRF protection. The session is a cookie, so the browser would attach it to a form
// another site posts to us. Browsers send an Origin header with every cross-site write, so a
// write whose Origin isn't this site is refused.
//
// "This site" is the Host the browser used: Next forwards /api/* with x-forwarded-host set to it
// (and Caddy keeps it), so the services need no setting. ALLOWED_ORIGINS adds others, comma
// separated. A write with no Origin isn't from a browser on another site (it's another service,
// a script or a test) and is allowed; its cookie, if any, still has to be valid.
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const hostOf = (origin: string) => {
    try {
        return new URL(origin).host;
    } catch {
        return null;
    }
};
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.split(",")[0]?.trim();

export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
    if (!WRITES.has(req.method)) return next();
    const origin = req.headers.origin;
    if (origin === undefined) return next();
    const host = hostOf(origin); // "null" (sandboxed frames, some redirects) has no host
    const allowed = new Set(
        [
            first(req.headers["x-forwarded-host"]),
            req.headers.host,
            ...(process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => hostOf(o.trim())),
        ].filter(Boolean),
    );
    if (host && allowed.has(host)) return next();
    req.log?.warn({ origin, host: req.headers.host }, "cross-site write refused");
    next(forbidden("Cross-site request refused"));
}
