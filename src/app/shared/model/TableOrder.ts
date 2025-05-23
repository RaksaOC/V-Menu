import mongoose from "mongoose";
import { Order } from "./Order";

const TableOrderSchema = new mongoose.Schema(
    {
        table: { type: String, required: true },
        orders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
            },
        ],
        isPayed: { type: Boolean, default: false },
        resId: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

export const TableOrder = mongoose.models.TableOrder || mongoose.model("TableOrder", TableOrderSchema, "table_orders");
