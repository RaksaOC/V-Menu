// npm run dev:db: a local MongoDB on 127.0.0.1:27017 with no install, kept in .data/mongo.
// Each service still uses its own database on it (vmenu_restaurants, vmenu_menu, vmenu_orders).
// Skip this if you point the services at Atlas or your own MongoDB instead.
import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

mkdirSync(".data/mongo", { recursive: true });
const server = await MongoMemoryServer.create({
    instance: { port: 27017, ip: "127.0.0.1", dbPath: ".data/mongo", storageEngine: "wiredTiger" },
});
console.log(`MongoDB ready at ${server.getUri()} (data in .data/mongo)`);

const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
