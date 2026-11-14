import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String },
        ownerId: String,
    },
    {
        timestamps: true,
    }
);

export const Restaurant = mongoose.models.Restaurant || mongoose.model("Restaurant", restaurantSchema, "restaurants");
