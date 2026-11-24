import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError, requireRole, validate } from "@vmenu/common";
import { ConfirmPhotoBody, PhotoUploadBody } from "@vmenu/contracts";
import { countRefusal, countUpload } from "../lib/upload-metrics.js";
import { withRestaurant, type RouteContext } from "./context.js";

/**
 * /api/menu/:slug/images: the owner uploads photos; customers' browsers load them (VM-02, SEC-05).
 * PHOTOS-S3: the photo itself goes from the browser straight to object storage:
 *   POST /images/uploads  { contentType }  -> a signed form for one upload (step 1)
 *   (the browser posts the file to the form's url: step 2, not through this service)
 *   POST /images          { key }          -> { url }, the short URL to save on the dish (step 3)
 *   GET  /images/:id                       -> 302 to a signed storage link
 */
export function imagesRoutes({ services, restaurant }: RouteContext, { uploadsPerHour }: { uploadsPerHour: number }) {
    const r = Router({ mergeParams: true });
    const place = withRestaurant({ restaurant });

    // SEC-05: photo uploads per restaurant per hour (keyed by restaurant, not by IP). Counted when
    // the form is signed: that is what lets a file into storage.
    const uploadLimit = rateLimit({
        windowMs: 60 * 60_000,
        limit: uploadsPerHour,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        keyGenerator: (_req, res) => String(res.locals.restaurant._id),
        handler: (_req, _res, next) => next(new HttpError(429, "Too many photo uploads for this restaurant. Please try again later.")),
    });

    r.post(
        "/images/uploads",
        countRefusal, // B10: a refused form counts as that upload's result; a signed one is counted at step 3
        requireRole("owner"),
        place,
        uploadLimit,
        validate(PhotoUploadBody),
        async (req, res) => {
            res.status(201).json(await services.images.signUpload(res.locals.restaurant, req.body.contentType));
        },
    );

    r.post(
        "/images",
        countUpload, // B10: vmenu_image_uploads_total{result}
        requireRole("owner"),
        place,
        validate(ConfirmPhotoBody),
        async (req, res) => {
            res.status(201).json(await services.images.confirm(res.locals.restaurant, req.body.key));
        },
    );

    r.get("/images/:id", async (req, res) => {
        const photo = await services.images.open((await restaurant(req))._id, String(req.params.id));
        if ("redirect" in photo) {
            // The link is signed as of midnight UTC and good for 2 days, so an hour's cache is safe.
            res.set("Cache-Control", "public, max-age=3600").redirect(302, photo.redirect);
            return;
        }
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
