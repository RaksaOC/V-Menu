import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError, requireRole } from "@vmenu/common";
import { countUpload } from "../lib/upload-metrics.js";
import type { RouteContext } from "./context.js";
import { receivePhoto } from "./upload.js";

/** /api/menu/:slug/images: the owner uploads photos; customers' browsers load them (VM-02, SEC-05). */
export function imagesRoutes({ services, restaurant }: RouteContext, { uploadsPerHour }: { uploadsPerHour: number }) {
    const r = Router({ mergeParams: true });

    // SEC-05: photo uploads per restaurant per hour (keyed by restaurant, not by IP).
    const uploadLimit = rateLimit({
        windowMs: 60 * 60_000,
        limit: uploadsPerHour,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        keyGenerator: (_req, res) => String(res.locals.restaurant._id),
        handler: (_req, _res, next) => next(new HttpError(429, "Too many photo uploads for this restaurant. Please try again later.")),
    });

    r.post(
        "/images",
        countUpload, // B10: vmenu_image_uploads_total{result}
        requireRole("owner"),
        async (req, res, next) => {
            res.locals.restaurant = await restaurant(req);
            next();
        },
        uploadLimit,
        receivePhoto,
        async (req, res) => {
            res.status(201).json(await services.images.upload(res.locals.restaurant, req.file!.buffer));
        },
    );

    r.get("/images/:id", async (req, res) => {
        const photo = await services.images.open((await restaurant(req))._id, String(req.params.id));
        res.set({
            "Content-Type": "image/webp",
            "Content-Length": String(photo.length),
            "Cache-Control": "public, max-age=31536000, immutable", // the id changes when the photo does
            "X-Content-Type-Options": "nosniff",
        });
        await new Promise<void>((resolve, reject) => {
            photo.stream.on("error", reject).on("end", resolve).pipe(res);
        });
    });
    return r;
}
