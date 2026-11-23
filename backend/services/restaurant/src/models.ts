import mongoose from "mongoose";

// restaurant-service owns these two collections. No other service reads them directly.

const restaurantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        slug: { type: String, required: true, unique: true },
        ownerId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

const tenantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        tenantId: { type: String, required: true, index: true }, // Firebase uid
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        role: { type: String, required: true, enum: ["owner", "cashier", "chef"] },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Restaurant = mongoose.model("Restaurant", restaurantSchema, "restaurants");
export const Tenant = mongoose.model("Tenant", tenantSchema, "tenants");

function slugify(name: string) {
    return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

// Same slug format as before: "<name>-<6 random chars>".
export function generateSlug(name: string) {
    return `${slugify(name) || "restaurant"}-${Math.random().toString(36).substring(2, 8)}`;
}

// A new restaurant gives its owner all three roles, as the original signup did.
export async function createRestaurantForOwner(name: string, owner: { uid: string; email: string; name: string }) {
    const restaurant = await Restaurant.create({ name, slug: generateSlug(name), ownerId: owner.uid });
    await Tenant.insertMany(
        (["owner", "cashier", "chef"] as const).map((role) => ({
            tenantId: owner.uid,
            name: owner.name,
            email: owner.email,
            role,
            resId: String(restaurant._id),
        })),
    );
    return restaurant;
}
