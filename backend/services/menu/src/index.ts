import mongoose from "mongoose";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";
import { createApp } from "./app.js";
import { prepareDatabase } from "./db.js";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "ORDER_SERVICE_URL");
const port = Number(process.env.PORT ?? 4102);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");
// Before the first request: prices in cents (CL-07), table link tokens (SEC-04), indexes (VM-16).
const { prices } = await prepareDatabase();
if (prices.migrated) logger.info(prices, "migrated dish prices to cents");

const server = createApp().listen(port, () => logger.info({ port }, "menu-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
