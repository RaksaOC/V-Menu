import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "@vmenu/common";

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
    (_req, _res, next) =>
        next(new HttpError(429, message, "TOO_MANY_ORDERS"));

/** The restaurant and the table as the order will store it (trimmed, at most 40 characters). */
const tableKey = (req: Request) =>
    `${String(req.params.slug)}:${String(req.body?.table ?? "")
        .trim()
        .slice(0, 40)}`;

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
