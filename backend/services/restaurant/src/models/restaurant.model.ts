import mongoose from "mongoose";

// restaurant-service owns restaurants and tenants. No other service reads them directly.
const restaurantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        slug: { type: String, required: true, unique: true },
        ownerId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Restaurant = mongoose.model("Restaurant", restaurantSchema, "restaurants");
