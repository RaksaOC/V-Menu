import mongoose from "mongoose";
import { createApp } from "./app.js";
import { verifyFirebaseIdToken } from "./firebase.js";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "FIREBASE_PROJECT_ID");
const port = Number(process.env.PORT ?? 4101);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");

const server = createApp({ verifyIdToken: verifyFirebaseIdToken }).listen(port, () => logger.info({ port }, "restaurant-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
