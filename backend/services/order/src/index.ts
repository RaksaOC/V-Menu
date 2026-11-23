import mongoose from "mongoose";
import { createApp } from "./app.js";
import { prepareDatabase } from "./db.js";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "MENU_SERVICE_URL");
const port = Number(process.env.PORT ?? 4103);

await mongoose.connect(process.env.MONGODB_URI!, { autoIndex: false }); // prepareDatabase builds them
logger.info("connected to MongoDB");

// CL-06: migrations, then indexes, before the first request.
const migrated = await prepareDatabase();
if (migrated.bills.renamed || migrated.bills.droppedIndexes.length) logger.info(migrated.bills, "migrated bills from isPayed to isPaid");
if (migrated.orders.migrated || migrated.orders.droppedIndexes.length)
    logger.info(migrated.orders, "migrated orders from isDone to status");

const server = createApp().listen(port, () => logger.info({ port }, "order-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
