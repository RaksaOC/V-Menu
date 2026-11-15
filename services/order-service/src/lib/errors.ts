import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export const badRequest = (msg = "Bad request") => new HttpError(400, msg);
export const unauthorized = (msg = "Not signed in") => new HttpError(401, msg);
export const forbidden = (msg = "Not allowed") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);

export function assertId(id: string, what = "id") {
    if (!mongoose.isValidObjectId(id)) throw badRequest(`Invalid ${what}`);
}

// Last middleware: known errors keep their status, anything else is logged and hidden.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message });
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
