import mongoose from "mongoose";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";
import { createApp } from "./app.js";
import { prepareDatabase } from "./db.js";
import { movePhotosToStorage } from "./migrations/gridfs-photos.js";
import { mongoImagesRepo } from "./repositories/images.repo.js";
import { minioPhotoStore, storageConfig } from "./repositories/photo-store.js";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "ORDER_SERVICE_URL");
// PHOTOS-S3: menu photos are in object storage (MinIO)
requireEnv("S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET");
const port = Number(process.env.PORT ?? 4102);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");
// Before the first request: prices in cents (CL-07), table link tokens (SEC-04), indexes (VM-16).
const { prices } = await prepareDatabase();
if (prices.migrated) logger.info(prices, "migrated dish prices to cents");

// PHOTOS-S3: the bucket and its clean-up rule (incoming/ expires after a day). Best effort: on the
// servers an admin made them already, and the service's key may not be allowed to. Then the
// photos still in GridFS are copied over; one that fails stays in GridFS and is tried again at
// the next start. /ready stays 503 while storage can't be reached.
const photos = minioPhotoStore(storageConfig());
try {
    await photos.setup();
} catch (err) {
    logger.warn({ err }, "could not set up the photo bucket or its clean-up rule; check that an admin has made both");
}
try {
    await movePhotosToStorage(mongoImagesRepo, photos, logger);
} catch (err) {
    logger.error({ err }, "could not move the GridFS photos to object storage; they are still served from GridFS");
}

const server = createApp({ photos }).listen(port, () => logger.info({ port }, "menu-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
