import mongoose from "mongoose";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";
import { createApp } from "./app.js";
import { prepareDatabase } from "./db.js";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "MENU_SERVICE_URL");
const port = Number(process.env.PORT ?? 4103);

await mongoose.connect(process.env.MONGODB_URI!, { autoIndex: false }); // prepareDatabase builds them
logger.info("connected to MongoDB");

// CL-06: migrations, then indexes, before the first request.
const migrated = await prepareDatabase();
// CL-06, VM-27: the old field names are kept and back-filled for one release (for a rollback)
const { bills, orders } = migrated;
if (bills.renamed || bills.backfilled || bills.droppedIndexes.length) logger.info(bills, "migrated bills from isPayed to isPaid");
if (orders.migrated || orders.backfilled || orders.droppedIndexes.length) logger.info(orders, "migrated orders from isDone to status");
if (migrated.money.migrated) logger.info(migrated.money, "migrated order lines to cents");

const server = createApp().listen(port, () => logger.info({ port }, "order-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
