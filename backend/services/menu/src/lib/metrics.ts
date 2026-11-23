import type { NextFunction, Request, Response } from "express";
import { prom, registry } from "@vmenu/common";

// B10: photo uploads (VM-02) by result, on this service's /metrics.
const uploads = new prom.Counter({
    name: "vmenu_image_uploads_total",
    help: "Menu photo uploads by result: ok, not_a_photo, too_large, bad_request, denied, rate_limited or error",
    labelNames: ["result"],
    registers: [registry],
});

/** The result label for an upload answer's status code. */
export function uploadResult(status: number): string {
    if (status < 300) return "ok";
    if (status === 413) return "too_large";
    if (status === 415) return "not_a_photo";
    if (status === 401 || status === 403) return "denied";
    if (status === 429) return "rate_limited";
    if (status < 500) return "bad_request";
    return "error";
}

/** Put first on the upload route: counts the upload once its answer is sent. */
export function countUpload(_req: Request, res: Response, next: NextFunction) {
    res.on("finish", () => uploads.inc({ result: uploadResult(res.statusCode) }));
    next();
}
