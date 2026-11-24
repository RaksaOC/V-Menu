import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { HttpError, unauthorized } from "./errors.js";

// Service-to-service calls carry a shared key. The gateway never forwards /internal/*,
// so these routes are only reachable from inside the Docker network.
export function requireInternal(req: Request, _res: Response, next: NextFunction) {
    const given = Buffer.from(String(req.headers["x-internal-key"] ?? ""));
    const expected = Buffer.from(process.env.INTERNAL_API_KEY ?? "");
    if (expected.length === 0 || given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return next(unauthorized("Internal route"));
    }
    next();
}

// Calls another service, forwarding the request id so logs from both sides line up.
export async function callService<T>(baseUrl: string, path: string, req: Request, init: RequestInit = {}): Promise<T> {
    let res: globalThis.Response;
    try {
        res = await fetch(`${baseUrl}${path}`, {
            ...init,
            headers: {
                "content-type": "application/json",
                "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
                "x-request-id": String(req.id ?? ""),
                ...(init.headers ?? {}),
            },
            signal: AbortSignal.timeout(5000),
        });
    } catch (err) {
        req.log?.error({ err, target: baseUrl + path }, "dependency unreachable");
        throw new HttpError(503, "A required service is unavailable");
    }
    const body = (await res.json().catch(() => ({}))) as T & { message?: string; code?: string };
    if (!res.ok) {
        // 4xx answers from the other service are passed on; 5xx become 502.
        // The code too (VM-06), so the browser can tell, say, a closed table from a sold-out dish.
        if (res.status < 500) throw new HttpError(res.status, body.message ?? "Request rejected", body.code);
        req.log?.error({ status: res.status, target: baseUrl + path }, "dependency failed");
        throw new HttpError(502, "A required service failed");
    }
    return body;
}
