// Demo data for menu-service's own database: tables and dishes for the demo restaurant.
import mongoose from "mongoose";
import { requireEnv } from "./lib/config.js";
import { Item, Table } from "./models.js";

const DEMO_RES_ID = "64b000000000000000000001";

const tables = ["T1", "T2", "T3", "T4"];
const items = [
    { name: "Fried Rice", price: 3.5, image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600" },
    { name: "Beef Lok Lak", price: 5.0, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600" },
    { name: "Fish Amok", price: 5.5, image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600" },
    { name: "Iced Coffee", price: 1.5, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600" },
];

requireEnv("MONGODB_URI");
await mongoose.connect(process.env.MONGODB_URI!);
for (const name of tables) {
    await Table.updateOne({ resId: DEMO_RES_ID, name }, { $set: { isEnabled: true } }, { upsert: true });
}
for (const { name, ...rest } of items) {
    await Item.updateOne({ resId: DEMO_RES_ID, name }, { $set: { ...rest, isEnabled: true } }, { upsert: true });
}
console.log(`seeded ${tables.length} tables and ${items.length} dishes`);
await mongoose.disconnect();
