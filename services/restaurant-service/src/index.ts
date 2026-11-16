import mongoose from "mongoose";
import { createApp } from "./app.js";
import { verifyFirebaseIdToken } from "./firebase.js";
import { requireEnv } from "./lib/config.js";
import { logger } from "./lib/logger.js";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "FIREBASE_PROJECT_ID");
const port = Number(process.env.PORT ?? 4101);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");

const server = createApp({ verifyIdToken: verifyFirebaseIdToken }).listen(port, () => logger.info({ port }, "restaurant-service listening"));

// Docker sends SIGTERM on stop: finish open requests, then close the database.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
        logger.info({ signal }, "shutting down");
        server.close(() => mongoose.disconnect().then(() => process.exit(0)));
    });
}
