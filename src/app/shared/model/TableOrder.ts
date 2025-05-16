import mongoose from "mongoose";
import {Order} from "./Order";

const TableOrderSchema = new mongoose.Schema({
    table: {
        type: String,
        required: true
    },
    orders: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        }
    ],
    isPayed: {
        type: Boolean,
        default: false
    },
    tenantId: { type: String, required: true },
});

export const TableOrder = mongoose.models.TableOrder || mongoose.model("TableOrder", TableOrderSchema, "table_orders");
