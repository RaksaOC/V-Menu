import mongoose from "mongoose";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";
import { createApp } from "./app.js";
import { firebaseVerifier, usesAuthEmulator } from "./clients/firebase.js";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "FIREBASE_PROJECT_ID");
const port = Number(process.env.PORT ?? 4101);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");

// B6: e2e runs sign in against the Firebase Auth emulator; never on a real server.
const verifyIdToken = firebaseVerifier();
if (usesAuthEmulator()) logger.warn({ host: process.env.FIREBASE_AUTH_EMULATOR_HOST }, "E2E=1: Firebase sign-ins go to the Auth emulator");

const server = createApp({ verifyIdToken }).listen(port, () => logger.info({ port }, "restaurant-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
