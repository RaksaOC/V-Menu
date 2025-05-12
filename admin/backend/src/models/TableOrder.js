const mongoose = require("mongoose");
const Order = require("./Order");

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
    }
});

const TableOrder = mongoose.models.TableOrder || mongoose.model("TableOrder", TableOrderSchema, "table_orders");
module.exports = TableOrder;