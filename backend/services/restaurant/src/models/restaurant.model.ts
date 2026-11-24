import mongoose from "mongoose";

// restaurant-service owns restaurants and memberships. No other service reads them directly.
const restaurantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        slug: { type: String, required: true, unique: true },
        ownerId: { type: String, required: true, index: true },
        // VM-24: how prices show, and the payment QR on the invoice. A restaurant made before VM-24
        // has none: the service answers the defaults (US dollars, 4,100 riel), so nothing is migrated.
        settings: {
            currency: { type: String, enum: ["USD", "KHR", "both"] },
            khrPerUsd: { type: Number },
            paymentQrUrl: { type: String },
        },
    },
    { timestamps: true },
);

export const Restaurant = mongoose.model("Restaurant", restaurantSchema, "restaurants");
