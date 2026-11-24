// Demo data for restaurant-service's own database: one restaurant and its owner.
// Set SEED_OWNER_UID / SEED_OWNER_EMAIL to  Firebase user to sign in as the owner.

import mongoose from "mongoose";
import { requireEnv } from "@vmenu/common";
import { Restaurant } from "./models/restaurant.model.js";
import { Membership } from "./models/membership.model.js";

const DEMO_RES_ID = "64b000000000000000000001";
const DEMO_SLUG = "demo-bistro";

requireEnv("MONGODB_URI");
const owner = {
    uid: process.env.SEED_OWNER_UID ?? "demo-owner",
    email: process.env.SEED_OWNER_EMAIL ?? "owner@demo.local",
    name: "Demo Owner",
};

await mongoose.connect(process.env.MONGODB_URI!);
await Restaurant.updateOne({ _id: DEMO_RES_ID }, { $set: { name: "Demo Bistro", slug: DEMO_SLUG, ownerId: owner.uid } }, { upsert: true });
for (const role of ["owner", "cashier", "chef"] as const) {
    await Membership.updateOne(
        { resId: DEMO_RES_ID, role, tenantId: owner.uid },
        { $set: { name: owner.name, email: owner.email } },
        { upsert: true },
    );
}
process.stdout.write(`seeded restaurant "${DEMO_SLUG}" (owner ${owner.email})\n`);
await mongoose.disconnect();
