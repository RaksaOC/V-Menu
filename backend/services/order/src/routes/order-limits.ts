import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "@vmenu/common";
import { countRateLimitedOrder } from "../lib/order-metrics.js";

// VM-22: ordering needs no sign-in, so it has limits instead: per client and per table. The counts
// live in this process's memory, so a restart clears them.

export interface OrderLimits {
    /** orders per client address, per minute */
    perMinute: number;
    /** orders per table, per 10 minutes */
    perTable: number;
}

const positive = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** ORDERS_PER_MINUTE and ORDERS_PER_TABLE; anything that isn't a positive whole number means the default. */
export const orderLimitsFromEnv = (): OrderLimits => ({
    perMinute: positive(process.env.ORDERS_PER_MINUTE, 10),
    perTable: positive(process.env.ORDERS_PER_TABLE, 30),
});

const refuse =
    (message: string): RequestHandler =>
    (_req, _res, next) => {
        countRateLimitedOrder(); // B10: vmenu_orders_rate_limited_total
        next(new HttpError(429, message, "TOO_MANY_ORDERS"));
    };

/**
 * The table the order is for, in its restaurant. SEC-04: an order from a table's QR link sends
 * only its token, so the token is the table; otherwise the table name as the order will store it
 * (trimmed, at most 40 characters). A token that opens no table is refused before it counts
 * (skipFailedRequests), so made-up tokens never use up a real table's count.
 */
export const tableKey = (req: Request) => {
    const body = (req.body ?? {}) as { qrToken?: unknown; table?: unknown };
    const table =
        typeof body.qrToken === "string" && body.qrToken
            ? `link:${body.qrToken.slice(0, 40)}`
            : `name:${String(body.table ?? "")
                  .trim()
                  .slice(0, 40)}`;
    return `${String(req.params.slug)}:${table}`;
};

export function orderLimiters({ perMinute, perTable }: OrderLimits): RequestHandler[] {
    const shared = { standardHeaders: "draft-8", legacyHeaders: false } as const;
    return [
        rateLimit({
            ...shared,
            windowMs: 60_000,
            limit: perMinute,
            handler: refuse("You're ordering very quickly. Please wait a minute and try again."),
        }),
        rateLimit({
            ...shared,
            windowMs: 10 * 60_000,
            limit: perTable,
            keyGenerator: tableKey,
            skipFailedRequests: true, // only orders that were really placed count against the table
            handler: refuse(
                "This table has placed a lot of orders in the last few minutes. Please wait a little, or ask a member of staff.",
            ),
        }),
    ];
}
