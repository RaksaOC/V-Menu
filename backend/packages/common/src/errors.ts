import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { recordAccessFailure, type AccessFailure, type Caller } from "./access-log.js";

export class HttpError extends Error {
    /** SEC-10: why access was refused, and by whom, for our logs and metrics. Never sent to the caller. */
    accessFailure?: AccessFailure;
    caller?: Caller;
    /** SEC-10: another service refused this and has already counted it. */
    passedOn?: boolean;

    /** `code` is a stable, machine-readable reason the frontend can switch on (e.g. TABLE_CLOSED).
     *  `fields` names what to fix in a form: { price: "Must be a number" } (CL-05, VM-17). */
    constructor(
        public status: number,
        message: string,
        public code?: string,
        public fields?: Record<string, string>,
    ) {
        super(message);
    }
}

export const badRequest = (msg = "Bad request") => new HttpError(400, msg);
function refusal(status: number, msg: string, reason?: AccessFailure, caller?: Caller) {
    const err = new HttpError(status, msg);
    err.accessFailure = reason;
    err.caller = caller;
    return err;
}
export const unauthorized = (msg = "Not signed in", reason?: AccessFailure, caller?: Caller) => refusal(401, msg, reason, caller);
export const forbidden = (msg = "Not allowed", reason?: AccessFailure, caller?: Caller) => refusal(403, msg, reason, caller);
export const notFound = (msg = "Not found") => new HttpError(404, msg);

export function assertId(id: string, what = "id") {
    if (!mongoose.isValidObjectId(id)) throw badRequest(`Invalid ${what}`);
}

// Last middleware: known errors keep their status, anything else is logged and hidden.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        if ([401, 403, 429].includes(err.status) && !err.passedOn)
            recordAccessFailure(req, err.status, err.accessFailure ?? (err.status === 429 ? "rate_limited" : "other"), err.caller);
        res.status(err.status).json({
            ...(err.code && { code: err.code }),
            message: err.message,
            ...(err.fields && { fields: err.fields }),
        });
        return;
    }
    if (err instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof SyntaxError && "body" in err) {
        res.status(400).json({ message: "Invalid JSON body" });
        return;
    }
    req.log?.error({ err }, "unhandled error");
    res.status(500).json({ message: "Something went wrong" });
}
