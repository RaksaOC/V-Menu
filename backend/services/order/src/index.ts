import mongoose from "mongoose";
import { createApp } from "./app.js";
import { requireEnv, logger, handleShutdown } from "@vmenu/common";

requireEnv("MONGODB_URI", "JWT_SECRET", "INTERNAL_API_KEY", "RESTAURANT_SERVICE_URL", "MENU_SERVICE_URL");
const port = Number(process.env.PORT ?? 4103);

await mongoose.connect(process.env.MONGODB_URI!);
logger.info("connected to MongoDB");

// VM-08: the "one open bill per table" index can't be built while some table already has two
// open bills (from before it existed). Say so plainly; the cashier should settle one of them.
const { Bill } = await import("./models/bill.model.js");
Bill.on("index", (err?: Error) => {
    if (err)
        logger.error({ err }, "could not build the one-open-bill-per-table index: a table has two open bills; mark one paid, then restart");
});

const server = createApp().listen(port, () => logger.info({ port }, "order-service listening"));

// Docker sends SIGTERM on stop: drain open requests, close MongoDB, exit (lib/server.ts).
handleShutdown(server);
