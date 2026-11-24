import type { NextFunction, Request, Response } from "express";
import { prom, registry } from "@vmenu/common";

// B10: photo uploads (VM-02) by result, on this service's /metrics. PHOTOS-S3: an upload is two
// calls here (the signed form, then the confirm); each upload is counted once: at the confirm, or
// at the form when that is refused.
const uploads = new prom.Counter({
    name: "vmenu_image_uploads_total",
    help: "Menu photo uploads by result: ok, not_a_photo, too_large, bad_request, denied, rate_limited or error",
    labelNames: ["result"],
    registers: [registry],
});

// Every result starts at 0: Prometheus' increase() can't see a series' first value.
for (const result of ["ok", "not_a_photo", "too_large", "bad_request", "denied", "rate_limited", "error"]) uploads.inc({ result }, 0);

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

/** Put first on the confirm route: counts the upload once its answer is sent. */
export function countUpload(_req: Request, res: Response, next: NextFunction) {
    res.on("finish", () => uploads.inc({ result: uploadResult(res.statusCode) }));
    next();
}

/** Put first on the signed-form route: counts the upload only when the form is refused. */
export function countRefusal(_req: Request, res: Response, next: NextFunction) {
    res.on("finish", () => {
        if (res.statusCode >= 300) uploads.inc({ result: uploadResult(res.statusCode) });
    });
    next();
}
