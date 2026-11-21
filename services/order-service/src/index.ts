import mongoose from "mongoose";
import { createApp } from "./app.js";
import { requireEnv } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { handleShutdown } from "./lib/server.js";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "MENU_SERVICE_URL");
const port = Number(process.env.PORT ?? 4103);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");

const server = createApp().listen(port, () => logger.info({ port }, "order-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
