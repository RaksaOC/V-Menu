import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { badRequest, HttpError } from "@vmenu/common";
import { MAX_BYTES } from "../services/photos.js";

/** Reads one file field called "image" into memory, with the size limit as a 413 (SEC-05). */
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5 } }).single("image");
export function receivePhoto(req: Request, res: Response, next: NextFunction) {
    parser(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            return next(
                err.code === "LIMIT_FILE_SIZE"
                    ? new HttpError(413, "Photos can be at most 5 MB")
                    : badRequest('Send one photo in the "image" field'),
            );
        }
        if (err) return next(err);
        if (!req.file) return next(badRequest('Send one photo in the "image" field'));
        next();
    });
}
