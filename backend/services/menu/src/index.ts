import mongoose from "mongoose";
import { createApp } from "./app.js";
import { prepareDatabase } from "./db.js";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "ORDER_SERVICE_URL");
const port = Number(process.env.PORT ?? 4102);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");
await prepareDatabase(); // VM-16: the unique table-name index

const server = createApp().listen(port, () => logger.info({ port }, "menu-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
