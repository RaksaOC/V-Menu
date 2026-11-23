// Demo data for menu-service's own database: tables, categories (VM-25) and dishes for the demo restaurant.
import mongoose from "mongoose";
import { requireEnv } from "@vmenu/common";
import { Category } from "./models/category.model.js";
import { Item } from "./models/item.model.js";
import { Table } from "./models/table.model.js";

const DEMO_RES_ID = "64b000000000000000000001";

const tables = ["T1", "T2", "T3", "T4"];
const categories = ["Mains", "Drinks"];
const items = [
    { name: "Fried Rice", priceCents: 350, category: "Mains", image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600" },
    { name: "Beef Lok Lak", priceCents: 500, category: "Mains", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600" },
    { name: "Fish Amok", priceCents: 550, category: "Mains", image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600" },
    {
        name: "Iced Coffee",
        priceCents: 150,
        category: "Drinks",
        image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600",
    },
];

requireEnv("MONGODB_URI");
await mongoose.connect(process.env.MONGODB_URI!);
for (const name of tables) {
    await Table.updateOne({ resId: DEMO_RES_ID, name }, { $set: { isEnabled: true } }, { upsert: true });
}
const categoryIds = new Map<string, string>();
for (const [sortOrder, name] of categories.entries()) {
    const c = await Category.findOneAndUpdate({ resId: DEMO_RES_ID, name }, { $setOnInsert: { sortOrder } }, { upsert: true, new: true });
    categoryIds.set(name, String(c._id));
}
for (const { name, category, ...rest } of items) {
    await Item.updateOne(
        { resId: DEMO_RES_ID, name },
        { $set: { ...rest, price: rest.priceCents / 100, categoryId: categoryIds.get(category), isEnabled: true } },
        { upsert: true },
    );
}
console.log(`seeded ${tables.length} tables, ${categories.length} categories and ${items.length} dishes`);
await mongoose.disconnect();
